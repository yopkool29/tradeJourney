import { IncomingForm } from 'formidable'
import { parseMT5Xls } from '../utils/mt5-parser'
import { prisma } from '../utils/prisma'
import type { AccountTrades } from '../utils'
import { symbolPricePerPoint } from '~/utils'
import { generateUniqueId, CreateTradeSchema } from '~/schema/trade'
import auth from '../utils/auth'
import { existsSync, readFileSync } from 'fs';
import * as XLSX from 'xlsx'
import { deleteAccountTrades } from './trades/account/[accountId].delete'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const config = {
    api: {
        bodyParser: false,
    },
}

const processTrades = async (parsedTrades: AccountTrades, countUpdated: number, countDiscard: number) => {
    if (!parsedTrades) {
        throw { statusCode: 400, message: 'Fichier invalide.' }
    }

    // Gérer le compte
    let account = await prisma.account.findUnique({
        where: { name: parsedTrades.accountInfo.name }
    })

    if (!account) {
        account = await prisma.account.create({
            data: {
                name: parsedTrades.accountInfo.name,
                displayName: parsedTrades.accountInfo.name,
                fullname: parsedTrades.accountInfo.fullname
            }
        })
    } else {
        // Supprimer les trades existants pour les jours qui vont être réimportés
        for (const day of parsedTrades.accountInfo.tradingDays) {
            const startOfDay = new Date(day);
            const endOfDay = new Date(day);
            endOfDay.setDate(endOfDay.getDate() + 1);

            console.log(`processTrades: Deleting trades from ${day} for account ${account.name}`)

            // Utiliser la fonction réutilisable avec filtre de date
            await deleteAccountTrades(account.id, undefined, {
                startDate: startOfDay,
                endDate: endOfDay
            });
        }
    }

    const accountId = account.id

    // Traiter chaque trade
    for (const trade of parsedTrades.trades) {
        try {
            const tradeWithAccount = { ...trade, accountId }
            const parsedTrade = CreateTradeSchema.parse(tradeWithAccount)
            const uniqueId = generateUniqueId(accountId, parsedTrade.symbol, parsedTrade.openDate, parsedTrade.closeDate, trade.extendId)

            const existingTrade = await prisma.trade.findUnique({ where: { uniqueId } })
            if (!existingTrade) {
                await prisma.trade.create({
                    data: {
                        ...parsedTrade,
                        uniqueId,
                        active: true,
                        screenshots: { create: [] }
                    }
                })
                countUpdated++
            } else {
                countDiscard++
            }
        } catch (error) {
            console.error('processTrades: Erreur lors du traitement du trade:', error)
            countDiscard++
        }
    }

    return { countUpdated, countDiscard }
}

// Fonction utilitaire pour mettre à jour les symboles
const updateSymbols = async (trades: { symbol: string }[], pricePerPointDefault: number = -1, default_digit: number = 4) => {
    const symbols = new Set(trades.map(t => t.symbol))
    for (const symbol of symbols) {
        try {
            const existingSymbol = await prisma.configSymbol.findUnique({
                where: { symbol }
            })
            if (!existingSymbol) {
                // Déterminer le pricePerPoint en fonction du symbole
                const pricePerPoint = symbolPricePerPoint[symbol as keyof typeof symbolPricePerPoint] || pricePerPointDefault;

                await prisma.configSymbol.create({
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
        form.parse(event.node.req, async (err, fields, files) => {
            if (err)
                return reject({ statusCode: 400, message: "Erreur lors de l'upload." })

            try {
                const reportType = fields.reportType?.[0] || 'mt5';
                const timezone = fields.timezone?.[0] || 'Europe/Paris';

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

                if (reportType === 'mt5') {
                    // Traitement MT5 (un seul compte)
                    const rawData = readFileSync(realFile.filepath)
                    const workbook = XLSX.read(rawData);
                    const sheetName = workbook.SheetNames[0]
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as MT5XlsRawRow[]
                    const mt5Trades = parseMT5Xls(rows, timezone)

                    if (!mt5Trades) {
                        throw { statusCode: 400, message: 'Format de fichier MT5 invalide. Impossible de trouver les informations du compte.' };
                    }

                    // Traiter les trades MT5
                    const result = await processTrades(mt5Trades, 0, 0)
                    countUpdated += result.countUpdated
                    countDiscard += result.countDiscard

                    const trades = mt5Trades.trades;

                    await updateSymbols(trades)

                } else if (reportType === 'nt8') {
                    // Traitement NT8 avec support multi-comptes
                    const csvContent = readFileSync(realFile.filepath, 'utf-8')
                    const accountsTrades = parseNTExecutions(csvContent, timezone)

                    // Traiter chaque compte séparément
                    for (const accountTrades of accountsTrades) {
                        try {
                            // accountTrades.accountInfo.tradingDays
                            const result = await processTrades(accountTrades, 0, 0)
                            countUpdated += result.countUpdated
                            countDiscard += result.countDiscard

                            // Mettre à jour les symboles et les profits pour ce compte
                            await updateSymbols(accountTrades.trades, 10, 0);
                            // await updateFuturesTradesProfit(accountTrades.trades);
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
                return reject({
                    statusCode: 500,
                    message: process.env.NODE_ENV === 'development' ? `Error during import processing. "${err instanceof Error ? err.message : String(err)}"` : "An error occurred while processing the import.",
                })
            }
        })
    })
})
