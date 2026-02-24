import type { AccountTrades, TradesImport, AccountInfoImport } from './index'
import { ImportMode, parseISO8601Date } from '~/utils/date-utils'
import { DateTime } from 'luxon'
import { parseCSVLine } from './csv-utils'

export interface AccountTradesWithImportName extends AccountTrades {
    importName: string
}

/**
 * Parse un fichier CSV au format standard TradeJourney
 * @param csvContent - Contenu du fichier CSV
 * @param timezone - Timezone par défaut
 * @param importMode - Mode d'import ('local' ou 'utc')
 * @param accountTimezones - Map des timezones et importMode par compte
 * @returns Liste des trades groupés par compte avec leur importName
 */
export function parseStandardCSV(
    csvContent: string,
    timezone: string = 'UTC',
    importMode: ImportMode = ImportMode.UTC,
    accountTimezones?: Map<string, { timezone: string; importMode: ImportMode }>
): AccountTradesWithImportName[] {
    const lines = csvContent.replace(/\r/g, '').trim().split('\n')
    
    if (lines.length < 2) {
        throw new Error('Le fichier CSV est vide ou ne contient pas de données')
    }

    // Parser l'en-tête
    const header = lines[0].split(',').map(h => h.trim())
    
    console.log('Header:', header)

    // Vérifier les colonnes obligatoires
    const requiredColumns = [
        'importName', 'accountName', 'accountFullname', 'openDate', 'closeDate',
        'symbol', 'type', 'lot', 'openPrice', 'closePrice', 'profit',
        'stopLoss', 'takeProfit', 'commission'
    ]
    
    for (const col of requiredColumns) {
        if (!header.includes(col)) {
            throw new Error(`Colonne obligatoire manquante: ${col}`)
        }
    }

    // Créer un index des colonnes
    const colIndex: Record<string, number> = {}
    header.forEach((col, idx) => {
        colIndex[col] = idx
    })

    // Parser les lignes de données
    const tradesByAccount = new Map<string, { accountInfo: AccountInfoImport; trades: TradesImport[]; importName: string }>()

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Parser la ligne CSV (gestion basique des guillemets)
        const values = parseCSVLine(line)

        if (values.length < requiredColumns.length) {
            console.warn(`Ligne ${i + 1} ignorée: nombre de colonnes incorrect (${values.length} < ${requiredColumns.length})`)
            continue
        }

        try {
            // Extraire les valeurs
            const importName = values[colIndex['importName']]
            const accountName = values[colIndex['accountName']]
            const accountFullname = values[colIndex['accountFullname']]
            
            // Déterminer la timezone et le mode d'import pour ce compte
            const accountTimezoneInfo = accountTimezones?.get(accountName)
            const effectiveTimezone = accountTimezoneInfo?.timezone ?? timezone
            const effectiveImportMode = accountTimezoneInfo?.importMode ?? importMode
            
            console.log(`Effective timezone for ${accountName}: ${effectiveTimezone}`)
            console.log(`Effective import mode for ${accountName}: ${effectiveImportMode}`)

            // Parser les dates (format ISO 8601) avec gestion des offsets UTC
            console.log(`Date strings: open=${values[colIndex['openDate']]}, close=${values[colIndex['closeDate']]}`)
            const openDate = parseISO8601Date(values[colIndex['openDate']], effectiveImportMode, effectiveTimezone)
            const closeDate = parseISO8601Date(values[colIndex['closeDate']], effectiveImportMode, effectiveTimezone)
            console.log(`Parsed dates: open=${openDate.toISOString()}, close=${closeDate.toISOString()}`)

            if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) {
                throw new Error(`Dates invalides à la ligne ${i + 1}`)
            }

            // Exchange est optionnel (pas pertinent pour toutes les sources de données)
            const exchange = colIndex['exchange'] !== undefined 
                ? (parseFloat(values[colIndex['exchange']]) || 0)
                : 0

            // Créer le trade
            const trade: TradesImport = {
                openDate,
                closeDate,
                symbol: values[colIndex['symbol']],
                type: values[colIndex['type']] as 'buy' | 'sell',
                lot: parseFloat(values[colIndex['lot']]),
                openPrice: parseFloat(values[colIndex['openPrice']]),
                closePrice: parseFloat(values[colIndex['closePrice']]),
                profit: parseFloat(values[colIndex['profit']]),
                stopLoss: parseFloat(values[colIndex['stopLoss']]),
                takeProfit: parseFloat(values[colIndex['takeProfit']]),
                commission: parseFloat(values[colIndex['commission']]),
                exchange,
                screenshotUrl: null
            }

            // Ajouter les champs optionnels
            if (colIndex['extendId'] !== undefined && values[colIndex['extendId']]) {
                trade.extendId = values[colIndex['extendId']]
            }

            if (colIndex['profit_points'] !== undefined && values[colIndex['profit_points']]) {
                trade.profit_points = parseFloat(values[colIndex['profit_points']])
            }

            if (colIndex['screenshotUrl'] !== undefined && values[colIndex['screenshotUrl']]) {
                trade.screenshotUrl = values[colIndex['screenshotUrl']]
            }

            if (colIndex['mae'] !== undefined && values[colIndex['mae']]) {
                trade.mae = parseFloat(values[colIndex['mae']])
            }

            if (colIndex['mfe'] !== undefined && values[colIndex['mfe']]) {
                trade.mfe = parseFloat(values[colIndex['mfe']])
            }

            // Options-specific fields
            if (colIndex['instrumentType'] !== undefined && values[colIndex['instrumentType']]) {
                trade.instrumentType = values[colIndex['instrumentType']]
            }

            if (colIndex['strikePrice'] !== undefined && values[colIndex['strikePrice']]) {
                trade.strikePrice = parseFloat(values[colIndex['strikePrice']])
            }

            if (colIndex['expirationDate'] !== undefined && values[colIndex['expirationDate']]) {
                trade.expirationDate = values[colIndex['expirationDate']]
            }

            if (colIndex['optionType'] !== undefined && values[colIndex['optionType']]) {
                trade.optionType = values[colIndex['optionType']]
            }

            if (colIndex['premium'] !== undefined && values[colIndex['premium']]) {
                trade.premium = parseFloat(values[colIndex['premium']])
            }

            if (colIndex['metadata'] !== undefined && values[colIndex['metadata']]) {
                trade.metadata = values[colIndex['metadata']]
            }

            // Valider le type
            if (trade.type !== 'buy' && trade.type !== 'sell') {
                throw new Error(`Type de trade invalide à la ligne ${i + 1}: ${trade.type}`)
            }

            // Grouper par compte
            const accountKey = `${importName}:${accountName}`
            
            if (!tradesByAccount.has(accountKey)) {
                tradesByAccount.set(accountKey, {
                    accountInfo: {
                        name: accountName,
                        fullname: accountFullname,
                        tradingDays: []
                    },
                    trades: [],
                    importName
                })
            }

            tradesByAccount.get(accountKey)!.trades.push(trade)

        } catch (error) {
            console.error(`Erreur lors du parsing de la ligne ${i + 1}:`, error)
            throw error
        }
    }

    // Calculer les tradingDays pour chaque compte
    const result: AccountTradesWithImportName[] = []
    
    for (const [_, accountData] of tradesByAccount) {
        const tradingDays = new Set<string>()
        
        accountData.trades.forEach(trade => {
            const tradeDay = DateTime.fromJSDate(trade.closeDate).toISODate()
            if (tradeDay) tradingDays.add(tradeDay)
        })

        accountData.accountInfo.tradingDays = [...tradingDays].sort()
        
        result.push({
            accountInfo: accountData.accountInfo,
            trades: accountData.trades,
            importName: accountData.importName
        })
    }

    return result
}

