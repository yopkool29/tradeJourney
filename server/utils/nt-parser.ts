import { DateTime } from "luxon";
import type { AccountTrades, TradesImport } from './index';

export interface NTRawTrade {
    'Trade number': string;
    'Instrument': string;
    'Account': string;
    'Strategy': string;
    'Market pos.': 'Long' | 'Short';
    'Qty': string;
    'Entry price': string;
    'Exit price': string;
    'Entry time': string;
    'Exit time': string;
    'Entry name': string;
    'Exit name': string;
    'Profit': string;
    'Cum. net profit': string;
    'Commission': string;
    'MAE': string;
    'MFE': string;
    'ETD': string;
    'Bars': string;
}

export type NTParserImport = AccountTrades[];

export function parseNTCsv(csvContent: string): NTRawTrade[] {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(';').map(h => h.trim());

    return lines.slice(1).map(line => {
        const values = line.split(';').map(v => v.trim());
        return headers.reduce((obj, header, index) => {
            (obj as any)[header] = values[index] || '';
            return obj;
        }, {} as NTRawTrade);
    });
}

/**
 * Agrège les trades qui sont à peu près au même moment (à 2-3 secondes près) sur le même actif
 * et avec des prix quasiment identiques, en additionnant les lots.
 * @param trades Liste des trades à agréger
 * @param timeThresholdMs Seuil de temps en millisecondes pour considérer que deux trades sont au même moment (défaut: 3000ms)
 * @returns Liste des trades agrégés
 */
export function aggregateSimilarTrades(
    trades: TradesImport[], 
    timeThresholdMs = 3000 // Seuil de temps en millisecondes pour considérer que deux trades sont au même moment
): TradesImport[] {
    if (trades.length <= 1) return trades;

    // Trier les trades par symbole, type, date d'ouverture et date de fermeture
    const sortedTrades = [...trades].sort((a, b) => {
        // D'abord par symbole
        if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
        // Ensuite par type (buy/sell)
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        // Ensuite par date d'ouverture
        const openTimeDiff = a.openDate.getTime() - b.openDate.getTime();
        if (openTimeDiff !== 0) return openTimeDiff;
        // Enfin par date de fermeture
        return a.closeDate.getTime() - b.closeDate.getTime();
    });

    const aggregatedTrades: TradesImport[] = [];
    let currentGroup: TradesImport[] = [sortedTrades[0]];

    for (let i = 1; i < sortedTrades.length; i++) {
        const currentTrade = sortedTrades[i];
        const previousTrade = currentGroup[currentGroup.length - 1];

        // Vérifier si les trades peuvent être agrégés
        const sameSymbol = currentTrade.symbol === previousTrade.symbol;
        const sameType = currentTrade.type === previousTrade.type;
        const timeDiffOpen = Math.abs(currentTrade.openDate.getTime() - previousTrade.openDate.getTime());
        const timeDiffClose = Math.abs(currentTrade.closeDate.getTime() - previousTrade.closeDate.getTime());

        if (
            sameSymbol && 
            sameType && 
            timeDiffOpen <= timeThresholdMs && 
            timeDiffClose <= timeThresholdMs
        ) {
            // Ajouter à la groupe actuel
            currentGroup.push(currentTrade);
        } else {
            // Agréger le groupe actuel et commencer un nouveau groupe
            aggregatedTrades.push(aggregateTradeGroup(currentGroup));
            currentGroup = [currentTrade];
        }
    }

    // Agréger le dernier groupe
    if (currentGroup.length > 0) {
        aggregatedTrades.push(aggregateTradeGroup(currentGroup));
    }

    return aggregatedTrades;
}

/**
 * Agrège un groupe de trades similaires en un seul trade
 * @param tradeGroup Groupe de trades à agréger
 * @returns Trade agrégé
 */
function aggregateTradeGroup(tradeGroup: TradesImport[]): TradesImport {
    // Debug - afficher les trades qui sont agrégés
    // if (tradeGroup.length > 1) {
    //     console.log(`\nAgrégation de ${tradeGroup.length} trades:`);
    //     tradeGroup.forEach(t => {
    //         console.log(`  ID: ${t.extendId}, Symbol: ${t.symbol}, Type: ${t.type}, Lot: ${t.lot}, Open: ${t.openDate.toLocaleTimeString('fr-FR')} @ ${t.openPrice}, Close: ${t.closeDate.toLocaleTimeString('fr-FR')} @ ${t.closePrice}`);
    //     });
    // }
    if (tradeGroup.length === 1) return tradeGroup[0];

    const firstTrade = tradeGroup[0];
    
    // Calculer les valeurs agrégées
    let totalLot = 0;
    let totalProfit = 0;
    let totalCommission = 0;
    let totalExchange = 0;
    
    // Utiliser les dates d'ouverture/fermeture les plus anciennes/récentes
    let earliestOpenDate = firstTrade.openDate;
    let latestCloseDate = firstTrade.closeDate;
    
    // Agréger les valeurs
    for (const trade of tradeGroup) {
        totalLot += trade.lot;
        totalProfit += trade.profit;
        totalCommission += trade.commission;
        totalExchange += trade.exchange;
        
        // Mettre à jour les dates si nécessaire
        if (trade.openDate < earliestOpenDate) {
            earliestOpenDate = trade.openDate;
        }
        if (trade.closeDate > latestCloseDate) {
            latestCloseDate = trade.closeDate;
        }
    }
    
    // Utiliser les prix du premier trade
    const openPrice = firstTrade.openPrice;
    const closePrice = firstTrade.closePrice;
    
    // Calculer les points de profit
    let profit_points = firstTrade.type === 'buy' 
        ? closePrice - openPrice 
        : openPrice - closePrice;
    profit_points = parseFloat(profit_points.toFixed(2));
    
    // Créer le trade agrégé
    return {
        ...firstTrade,
        extendId: firstTrade.extendId + '_agg' + tradeGroup.length,
        openDate: earliestOpenDate,
        closeDate: latestCloseDate,
        lot: totalLot,
        openPrice: openPrice,
        closePrice: closePrice,
        profit: totalProfit,
        profit_points,
        commission: totalCommission,
        exchange: totalExchange
    };
}

export function parseNTExecutions(csvContent: string, timezone: string, DEBUG = false): NTParserImport {
    const rows = parseNTCsv(csvContent);

    if (!rows || rows.length === 0) {
        return [];
    }

    const accountTrades = new Map<string, TradesImport[]>();
    const result: AccountTrades[] = [];

    const parseDate = (dateStr: string): Date => {
        const date = DateTime.fromFormat(dateStr, "dd/MM/yyyy HH:mm:ss", { zone: timezone });
        return date.isValid ? date.toJSDate() : new Date();
    };

    const parseCurrency = (currencyStr: string): number => {
        return parseFloat(currencyStr.replace(/[^\d,-]+/g, '').replace(',', '.')) || 0;
    };

    const parseNumber = (numStr: string): number => {
        return parseFloat(numStr.replace(/\./g, '').replace(',', '.')) || 0;
    };

    for (const row of rows) {
        const accountName = row['Account'];
        if (!accountName || accountName.includes("Sim")) {
            continue;
        }

        if (!accountTrades.has(accountName)) {
            accountTrades.set(accountName, []);
        }

        const trades = accountTrades.get(accountName)!;
        const tradeId = row['Trade number']
        const type = row['Market pos.'].toLowerCase() === 'long' ? 'buy' : 'sell' as const;
        const symbol = row['Instrument'].split(' ')[0];
        const quantity = parseNumber(row['Qty']);
        const openPrice = parseNumber(row['Entry price']);
        const closePrice = parseNumber(row['Exit price']);
        const profit = parseCurrency(row['Profit']);
        const commission = parseCurrency(row['Commission']);

        const date1 = parseDate(row['Entry time'])
        const date2 = parseDate(row['Exit time'])

        let nb_points = type === 'buy' ? closePrice - openPrice : openPrice - closePrice
        nb_points = parseFloat(nb_points.toFixed(2))


        const trade: TradesImport = {
            extendId: "-" + tradeId,
            openDate: date1,
            closeDate: date2,
            symbol,
            type,
            lot: quantity,
            openPrice,
            closePrice,
            profit,
            profit_points: nb_points,
            stopLoss: 0,
            takeProfit: 0,
            commission,
            exchange: 0,
            screenshotUrl: null
        };

        trades.push(trade);
    }

    for (const [accountName, trades] of accountTrades.entries()) {
        // Agréger les trades similaires
        const aggregatedTrades = aggregateSimilarTrades(trades);
        
        result.push({
            accountInfo: {
                name: accountName,
                fullname: accountName,
                tradingDays: []
            },
            trades: aggregatedTrades
        });
    }

    // setup trading days
    result.forEach(account => {
        const tradingDays = new Set<string>();
        account.trades.forEach(trade => {
            const tradeDay = DateTime.fromJSDate(trade.openDate).toISODate();
            if (tradeDay)
                tradingDays.add(tradeDay);
        });
        account.accountInfo.tradingDays = [...tradingDays]
    });


    if (DEBUG && result.length > 0) {
        // Afficher les jours d'importation
        console.log(`\n=== Imported days (${result[0].accountInfo.tradingDays.length} days) ===`);
        console.log([...result[0].accountInfo.tradingDays].sort().join(', '));
    }

    return result;
}
