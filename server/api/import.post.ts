import type { H3Event, EventHandlerRequest } from 'h3'
import type { PrismaClient as DataPrismaClient } from '~/generated/prisma-data'
import { IncomingForm } from 'formidable'
import { type MT5XlsRawRow, parseMT5Xls } from '~/server/utils/mt5-parser';
import { isTimezoneInput } from '~/type';
import { parseNTExecutions } from '../utils/nt-parser'
import { parseQuantowerExecutions } from '../utils/quantower-parser'
import { parseIBKRTrades } from '../utils/ibkr-parser'
import { parseStandardCSV } from '../utils/standard-csv-parser'
import { getDataDb } from '../utils/db'
import type { AccountTrades } from '../utils'
import { symbolPricePerPoint } from '~/utils'
import { generateUniqueId, CreateTradeSchema } from '~/schema/trade'
import auth from '../utils/auth'
import { existsSync, readFileSync } from 'fs';
import * as XLSX from 'xlsx'
import type { ImportMode } from '~/utils/date-utils'
import { createAppError } from '../utils/errors'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB


export const config = {
    api: {
        bodyParser: false,
    },
}

/**
 * Crée ou met à jour les DayTags pour les journées importées
 * @param dataDb - Instance Prisma
 * @param tradingDays - Liste des journées de trading (format ISO)
 * @param tagIds - IDs des tags à appliquer
 */
async function upsertDayTagsForImport(
    dataDb: DataPrismaClient,
    tradingDays: string[],
    tagIds: number[]
) {

    if (tagIds.length === 0) {
        console.log('upsertDayTagsForImport: No day tags to apply')
        return
    }

    for (const day of tradingDays) {
        // Parser la date ISO correctement (format: "2026-01-31")
        // Ajouter l'heure pour éviter les problèmes de timezone
        const dayDate = new Date(day + 'T00:00:00.000Z')

        // Chercher si un DayTag existe déjà pour cette date
        const existingDayTag = await dataDb.dayTag.findFirst({
            where: { date: dayDate }
        })

        if (existingDayTag) {

            // Récupérer les tags existants
            const existingAssocs = await dataDb.dayTagAssociation.findMany({
                where: { dayTagId: existingDayTag.id }
            })
            const existingTagIds = existingAssocs.map(a => a.tagId)

            // Ajouter uniquement les nouveaux tags (merge)
            const newTagIds = tagIds.filter(id => !existingTagIds.includes(id))

            if (newTagIds.length > 0) {
                console.log(`upsertDayTagsForImport: Adding new tags: ${JSON.stringify(newTagIds)}`)
                await dataDb.dayTagAssociation.createMany({
                    data: newTagIds.map(tagId => ({
                        dayTagId: existingDayTag.id,
                        tagId
                    }))
                })
            } else {
                console.log(`upsertDayTagsForImport: No new tags to add (all already present)`)
            }
        } else {
            // Créer un nouveau DayTag avec les tags
            const createdDayTag = await dataDb.dayTag.create({
                data: {
                    date: dayDate,
                    note: '',
                    DayTagAssociation: {
                        create: tagIds.map(tagId => ({
                            tag: { connect: { id: tagId } }
                        }))
                    }
                }
            })

            console.log(`upsertDayTagsForImport: Created DayTag with id ${createdDayTag.id}`)
        }
    }

    console.log(`upsertDayTagsForImport: Finished processing ${tradingDays.length} trading days`)
}

// Fonction utilitaire pour trouver un symbole par nom ou alias (avec wildcard)
const findSymbolByNameOrAlias = async (dataDb: DataPrismaClient, symbolName: string) => {
    const normalizedSymbol = symbolName.toUpperCase()

    // Chercher par nom exact
    let existingSymbol = await dataDb.configSymbol.findUnique({
        where: { symbol: normalizedSymbol }
    })

    // Si pas trouvé, chercher par alias
    if (!existingSymbol) {
        const allSymbols = await dataDb.configSymbol.findMany()
        existingSymbol = allSymbols.find(sym => {
            if (!sym.aliases) return false
            const aliases = sym.aliases.split(',').map(a => a.trim().toUpperCase())

            // Vérifier les alias exacts
            if (aliases.includes(normalizedSymbol)) return true

            // Vérifier les wildcards (ex: MES* match MESZ5, MESH5, etc.)
            return aliases.some(alias => {
                if (alias.endsWith('*')) {
                    const prefix = alias.slice(0, -1)
                    return normalizedSymbol.startsWith(prefix)
                }
                return false
            })
        }) || null
    }

    return existingSymbol
}

const processTrades = async (
    event: H3Event<EventHandlerRequest>,
    importName: string,
    parsedTrades: AccountTrades,
    countUpdated: number,
    countDiscard: number,
    keepExistingTrades: boolean = false,
    dayTagIds: number[] = [],
    tradeTagIds: number[] = [],
    instrumentType: string = 'any'
) => {
    if (!parsedTrades) {
        throw { statusCode: 400, message: 'Fichier invalide.' }
    }

    // Extraire userId et dbName depuis le contexte
    const userId = Number(event.context.userId)
    const dbName = event.context.dbName

    // Obtenir la bonne base de données
    const dataDb = await getDataDb(userId, dbName)

    // Gérer le compte
    let account = await dataDb.account.findUnique({
        where: { name: parsedTrades.accountInfo.name }
    })

    // Si pas trouvé par nom, chercher par alias
    if (!account) {
        const allAccounts = await dataDb.account.findMany()
        account = allAccounts.find(acc => {
            if (!acc.aliases) return false
            const aliases = acc.aliases.split(',').map(a => a.trim())
            return aliases.includes(parsedTrades.accountInfo.name)
        }) || null
    }

    if (!account) {
        account = await dataDb.account.create({
            data: {
                name: parsedTrades.accountInfo.name,
                displayName: parsedTrades.accountInfo.name,
                fullname: parsedTrades.accountInfo.fullname
            }
        })
    }

    console.log("keepExistingTrades:", keepExistingTrades)

    if (!keepExistingTrades) {
        // Supprimer les trades existants pour les jours qui vont être réimportés
        for (const day of parsedTrades.accountInfo.tradingDays) {
            const startOfDay = new Date(day);
            const endOfDay = new Date(day);
            endOfDay.setDate(endOfDay.getDate() + 1);

            console.log(`processTrades: Deleting trades from ${day} for account ${account.name} (importName: ${importName})`)

            // Supprimer directement les trades de la bonne base de données
            const result = await dataDb.trade.deleteMany({
                where: {
                    accountId: account.id,
                    openDate: {
                        gte: startOfDay,
                        lt: endOfDay
                    },
                    importName: importName
                }
            })
            console.log(`Deleted ${result.count} trades for day ${day} importName ${importName} account id: ${account.id}`)
        }
    } else {
        console.log(`processTrades: Keeping existing trades for account ${account.name} (importName: ${importName})`)
    }

    const accountId = account.id

    // Traiter chaque trade
    for (const trade of parsedTrades.trades) {
        try {
            // Normaliser le symbole en cherchant par alias
            const symbolConfig = await findSymbolByNameOrAlias(dataDb, trade.symbol)
            const normalizedSymbol = symbolConfig ? symbolConfig.symbol : trade.symbol.toUpperCase()

            const tradeWithAccount = { ...trade, symbol: normalizedSymbol, accountId }
            const parsedTrade = CreateTradeSchema.parse(tradeWithAccount)
            const uniqueId = generateUniqueId(importName, accountId, parsedTrade.symbol, parsedTrade.openDate, parsedTrade.closeDate, trade.extendId)

            const existingTrade = await dataDb.trade.findUnique({ where: { uniqueId } })
            if (!existingTrade) {
                const createdTrade = await dataDb.trade.create({
                    data: {
                        ...parsedTrade,
                        uniqueId,
                        importName,
                        active: true,
                        instrumentType: trade.instrumentType || instrumentType,
                        screenshots: { create: [] }
                    }
                })

                // Appliquer les tags au trade
                if (tradeTagIds.length > 0) {
                    await dataDb.tradeTagAssociation.createMany({
                        data: tradeTagIds.map(tagId => ({
                            tradeId: createdTrade.id,
                            tagId
                        })),
                        skipDuplicates: true
                    })
                }

                console.log(`✓ Trade created: ${parsedTrade.symbol} ${parsedTrade.type} ${parsedTrade.lot} @ ${parsedTrade.openDate.toISOString()}`)
                countUpdated++
            } else {
                // Trade existe déjà : remplacer les tags par ceux de l'import
                // Supprimer tous les tags existants du trade
                await dataDb.tradeTagAssociation.deleteMany({
                    where: { tradeId: existingTrade.id }
                })

                // Créer les nouveaux tags (si spécifiés)
                if (tradeTagIds.length > 0) {
                    await dataDb.tradeTagAssociation.createMany({
                        data: tradeTagIds.map(tagId => ({
                            tradeId: existingTrade.id,
                            tagId
                        })),
                        skipDuplicates: true
                    })
                }
                console.log(`⊗ Trade already exists (discarded): ${parsedTrade.symbol} ${parsedTrade.type} ${parsedTrade.lot} @ ${parsedTrade.openDate.toISOString()}`)
                countDiscard++
            }
        } catch (error) {
            console.error(`✗ Trade rejected: ${trade.symbol} ${trade.type} ${trade.lot} @ ${trade.openDate?.toISOString()}`)
            console.error('  Error:', error)
            countDiscard++
        }
    }

    // Appliquer les tags aux journées
    await upsertDayTagsForImport(dataDb, parsedTrades.accountInfo.tradingDays, dayTagIds)

    return { countUpdated, countDiscard }
}

// Fonction utilitaire pour mettre à jour les symboles
const updateSymbols = async (event: H3Event<EventHandlerRequest>, trades: { symbol: string }[], pricePerPointDefault: number = -1, default_digit: number = 4) => {
    const symbols = new Set(trades.map(t => t.symbol.toUpperCase()))

    // Extraire userId et dbName depuis le contexte
    const userId = Number(event.context.userId)
    const dbName = event.context.dbName

    const dataDb = await getDataDb(userId, dbName)

    for (const symbol of symbols) {
        try {
            // Chercher le symbole dans la bonne base de données
            const existingSymbol = await findSymbolByNameOrAlias(dataDb, symbol)

            if (!existingSymbol) {
                // Déterminer le pricePerPoint en fonction du symbole
                const pricePerPoint = symbolPricePerPoint[symbol as keyof typeof symbolPricePerPoint] || pricePerPointDefault;

                await dataDb.configSymbol.create({
                    data: {
                        symbol: symbol,
                        digit: default_digit, // Valeur par défaut pour le nombre de décimales
                        active: true,
                        pricePerPoint: pricePerPoint,
                        notes: `Symbole ajouté, pricePerPoint=${pricePerPoint}$`
                    }
                })
                console.log(`updateSymbols: New symbol added: ${symbol} with pricePerPoint=${pricePerPoint}$`)
            }
        } catch (error) {
            console.error(`updateSymbols: Error while updating symbol ${symbol}:`, error)
        }
    }
}

export default defineEventHandler(async (event) => {
    await auth(event)
    const form = new IncomingForm()

    return new Promise((resolve, reject) => {
        // Vérifier que la base de données est sélectionnée
        if (!event.context.dbName) {
            return reject({
                statusCode: 400,
                message: 'No database selected. Please select a database first.'
            })
        }
        form.parse(event.node.req, async (err, fields, files) => {
            if (err)
                return reject({ statusCode: 400, message: "Erreur lors de l'upload." })

            try {
                const reportType = fields.reportType![0];
                const importMode = fields.importMode![0] as ImportMode;
                const timezone = fields.timezone?.[0];

                if (!timezone || !isTimezoneInput(timezone)) {
                    throw { statusCode: 400, message: `Format de timezone invalide ou manquant: ${timezone}` };
                }
                const keepExistingTrades = fields.keepExistingTrades![0] === 'true';
                const instrumentType = fields.instrumentType?.[0] || 'any';

                // Parser les tags depuis le FormData
                const dayTagIdsStr = fields.dayTagIds?.[0]
                const tradeTagIdsStr = fields.tradeTagIds?.[0]
                const dayTagIds = dayTagIdsStr ? JSON.parse(dayTagIdsStr) : []
                const tradeTagIds = tradeTagIdsStr ? JSON.parse(tradeTagIdsStr) : []

                const fileList = Object.values(files)[0];
                const realFile = Array.isArray(fileList) ? fileList[0] : fileList;

                if (!realFile?.filepath)
                    throw { statusCode: 400, message: 'Fichier manquant.' };

                if (!existsSync(realFile.filepath)) {
                    throw { statusCode: 400, message: 'Fichier temporaire introuvable.' };
                }

                if (realFile.size > MAX_FILE_SIZE) {
                    throw { statusCode: 400, statusMessage: 'Fichier trop volumineux' }
                }

                let countUpdated = 0
                let countDiscard = 0

                // Timezone is now managed per import profile, not per account
                const accountTimezones = new Map<string, { timezone: string; importMode: ImportMode }>()

                if (reportType === 'mt5') {
                    // Traitement MT5 (un seul compte)
                    const rawData = readFileSync(realFile.filepath)
                    const workbook = XLSX.read(rawData);
                    const sheetName = workbook.SheetNames[0]
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as MT5XlsRawRow[]
                    const mt5Trades = parseMT5Xls(rows, timezone, importMode, accountTimezones)

                    if (!mt5Trades) {
                        throw { statusCode: 400, message: 'Format de fichier MT5 invalide. Impossible de trouver les informations du compte.' };
                    }

                    // Traiter les trades MT5
                    const result = await processTrades(event, "MT5", mt5Trades, 0, 0, keepExistingTrades, dayTagIds, tradeTagIds, instrumentType)
                    countUpdated += result.countUpdated
                    countDiscard += result.countDiscard

                    const trades = mt5Trades.trades;

                    await updateSymbols(event, trades)

                } else if (reportType === 'nt8') {
                    // Traitement NT8 avec support multi-comptes
                    const csvContent = readFileSync(realFile.filepath, 'utf-8')
                    const accountsTrades = parseNTExecutions(csvContent, timezone, importMode, accountTimezones)

                    // Traiter chaque compte séparément
                    for (const accountTrades of accountsTrades) {
                        try {
                            // accountTrades.accountInfo.tradingDays
                            const result = await processTrades(event, "NT8", accountTrades, 0, 0, keepExistingTrades, dayTagIds, tradeTagIds, instrumentType)
                            countUpdated += result.countUpdated
                            countDiscard += result.countDiscard

                            // Mettre à jour les symboles et les profits pour ce compte
                            await updateSymbols(event, accountTrades.trades, 10, 0);
                            // await updateFuturesTradesProfit(accountTrades.trades);
                        } catch (error) {
                            console.error(`Erreur lors du traitement du compte ${accountTrades.accountInfo.name}:`, error)
                            // On continue avec les autres comptes même en cas d'erreur
                            countDiscard += accountTrades.trades.length
                        }
                    }
                } else if (reportType === 'quantower') {
                    // Traitement Quantower avec support multi-comptes
                    const csvContent = readFileSync(realFile.filepath, 'utf-8')
                    const accountsTrades = parseQuantowerExecutions(csvContent, timezone, importMode, accountTimezones)

                    // Traiter chaque compte séparément
                    for (const accountTrades of accountsTrades) {
                        try {
                            const result = await processTrades(event, "Quantower", accountTrades, 0, 0, keepExistingTrades, dayTagIds, tradeTagIds, instrumentType)
                            countUpdated += result.countUpdated
                            countDiscard += result.countDiscard

                            // Mettre à jour les symboles pour ce compte
                            await updateSymbols(event, accountTrades.trades, 5, 2);
                        } catch (error) {
                            console.error(`Erreur lors du traitement du compte ${accountTrades.accountInfo.name}:`, error)
                            // On continue avec les autres comptes même en cas d'erreur
                            countDiscard += accountTrades.trades.length
                        }
                    }
                } else if (reportType === 'ibkr') {
                    // Traitement IBKR Flex Query avec support multi-comptes
                    const csvContent = readFileSync(realFile.filepath, 'utf-8')
                    const accountsTrades = parseIBKRTrades(csvContent, timezone, importMode, accountTimezones)

                    // Traiter chaque compte séparément
                    for (const accountTrades of accountsTrades) {
                        try {
                            const result = await processTrades(event, "IBKR", accountTrades, 0, 0, keepExistingTrades, dayTagIds, tradeTagIds, instrumentType)
                            countUpdated += result.countUpdated
                            countDiscard += result.countDiscard

                            // Mettre à jour les symboles pour ce compte
                            await updateSymbols(event, accountTrades.trades, 1, 3);
                        } catch (error) {
                            console.error(`Erreur lors du traitement du compte ${accountTrades.accountInfo.name}:`, error)
                            // On continue avec les autres comptes même en cas d'erreur
                            countDiscard += accountTrades.trades.length
                        }
                    }
                } else if (reportType === 'standard') {
                    // Traitement du format CSV standard TradeJourney
                    const csvBuffer = readFileSync(realFile.filepath)

                    const csvContent = csvBuffer.includes(0x00)
                        ? new TextDecoder('utf-16le').decode(csvBuffer)
                        : csvBuffer.toString('utf-8')

                    const accountsTrades = parseStandardCSV(csvContent, timezone, importMode, accountTimezones)

                    // Traiter chaque compte séparément avec son importName spécifique
                    for (const accountTrades of accountsTrades) {
                        try {
                            // Utiliser l'importName du CSV pour chaque compte
                            const result = await processTrades(event, accountTrades.importName, accountTrades, 0, 0, keepExistingTrades, dayTagIds, tradeTagIds, instrumentType)
                            countUpdated += result.countUpdated
                            countDiscard += result.countDiscard

                            // Mettre à jour les symboles pour ce compte
                            await updateSymbols(event, accountTrades.trades, 1, 3);
                        } catch (error) {
                            console.error(`Erreur lors du traitement du compte ${accountTrades.accountInfo.name}:`, error)
                            // On continue avec les autres comptes même en cas d'erreur
                            countDiscard += accountTrades.trades.length
                        }
                    }
                }

                resolve({
                    success: true,
                    message: `Importation réussie - ${countUpdated} trades mis à jour, ${countDiscard} ignorés`,
                    countUpdated,
                    countDiscard
                })

            } catch (err) {
                reject(createAppError({
                    statusCode: 500,
                    message: `Error during import processing`,
                    tag: 'api.import.processing_error',
                    error: err
                }))
            }
        })
    })
})
