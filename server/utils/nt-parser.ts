import { DateTime } from "luxon";
import type { AccountTrades, TradesImport } from './index';
import type { ImportMode } from '~/utils/date-utils';
import { parseNTDate } from '~/utils/date-utils';

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
            (obj as unknown as Record<string, string>)[header] = values[index] || '';
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
    let aggCounter = 0; // Compteur d'agrégation

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
            if (currentGroup.length > 1) {
                aggCounter++;
                aggregatedTrades.push(aggregateTradeGroup(currentGroup, aggCounter));
            } else {
                aggregatedTrades.push(currentGroup[0]);
            }
            currentGroup = [currentTrade];
        }
    }

    // Agréger le dernier groupe
    if (currentGroup.length > 0) {
        if (currentGroup.length > 1) {
            aggCounter++;
            aggregatedTrades.push(aggregateTradeGroup(currentGroup, aggCounter));
        } else {
            aggregatedTrades.push(currentGroup[0]);
        }
    }

    return aggregatedTrades;
}

/**
 * Agrège un groupe de trades similaires en un seul trade
 * @param tradeGroup Groupe de trades à agréger
 * @param aggCounter Numéro de séquence de l'agrégation
 * @returns Trade agrégé
 */
function aggregateTradeGroup(tradeGroup: TradesImport[], aggCounter: number): TradesImport {
    // Debug - afficher les trades qui sont agrégés
    // if (tradeGroup.length > 1) {
    //     console.log(`\nAgrégation de ${tradeGroup.length} trades:`);
    //     tradeGroup.forEach(t => {
    //         console.log(`  ID: ${t.extendId}, Symbol: ${t.symbol}, Type: ${t.type}, Lot: ${t.lot}, Open: ${t.openDate.toLocaleTimeString('fr-FR')} @ ${t.openPrice}, Close: ${t.closeDate.toLocaleTimeString('fr-FR')} @ ${t.closePrice}`);
    //     });
    // }

    const firstTrade = tradeGroup[0];

    // Calculer les valeurs agrégées
    let totalLot = 0;
    let totalProfit = 0;
    let totalCommission = 0;

    // Utiliser les dates d'ouverture/fermeture les plus anciennes/récentes
    let earliestOpenDate = firstTrade.openDate;
    let latestCloseDate = firstTrade.closeDate;

    // Agréger les valeurs
    for (const trade of tradeGroup) {
        totalLot += trade.lot;
        totalProfit += trade.profit;
        totalCommission += trade.commission;

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

    const netProfit = totalProfit - totalCommission;

    // Générer un extendId pour le trade agrégé : juste _agg_{compteur} (pas de numéro de trade car agrégé)
    const aggregatedExtendId = `_agg_${aggCounter}`;

    // Créer le trade agrégé
    return {
        extendId: aggregatedExtendId || firstTrade.extendId,
        openDate: earliestOpenDate,
        closeDate: latestCloseDate,
        symbol: firstTrade.symbol,
        type: firstTrade.type,
        lot: totalLot,
        openPrice: openPrice,
        closePrice: closePrice,
        profit: totalProfit,  // Profit BRUT
        netProfit: netProfit,  // Profit NET
        profit_points,
        stopLoss: 0,
        takeProfit: 0,
        commission: totalCommission,
        exchange: 0,
        screenshotUrl: null
    };
}

export function parseNTExecutions(csvContent: string, timezone: string, importMode: ImportMode, accountTimezones?: Map<string, { timezone: string; importMode: ImportMode }>, DEBUG = false): NTParserImport {
    const finalImportMode = importMode;
    const rows = parseNTCsv(csvContent);

    if (!rows || rows.length === 0) {
        return [];
    }

    const accountTrades = new Map<string, TradesImport[]>();
    const result: AccountTrades[] = [];

    const parseCurrency = (currencyStr: string): number => {
        return parseFloat(currencyStr.replace(/[^\d,-]+/g, '').replace(',', '.')) || 0;
    };

    const parseNumber = (numStr: string): number => {
        return parseFloat(numStr.replace(/\./g, '').replace(',', '.')) || 0;
    };

    // Track daily counters per account - reset to 1 each day
    const dailyCounters = new Map<string, { currentDate: string; counter: number }>();

    for (const row of rows) {
        const accountName = row['Account'];
        if (!accountName || accountName.includes("Sim")) {
            continue;
        }

        if (!accountTrades.has(accountName)) {
            accountTrades.set(accountName, []);
        }

        // Utiliser la timezone du compte si disponible
        const accountTimezoneInfo = accountTimezones?.get(accountName)
        const effectiveTimezone = accountTimezoneInfo?.timezone ?? timezone
        const effectiveImportMode = accountTimezoneInfo?.importMode ?? finalImportMode

        const parseDate = (dateStr: string): Date => {
            return parseNTDate(dateStr, effectiveImportMode, effectiveTimezone);
        };

        const trades = accountTrades.get(accountName)!;
        const type = row['Market pos.'].toLowerCase() === 'long' ? 'buy' : 'sell' as const;
        const symbol = row['Instrument'].split(' ')[0];
        const quantity = parseNumber(row['Qty']);
        const openPrice = parseNumber(row['Entry price']);
        const closePrice = parseNumber(row['Exit price']);
        const profit = parseCurrency(row['Profit']);
        const commission = parseCurrency(row['Commission']);

        const date1 = parseDate(row['Entry time'])
        const date2 = parseDate(row['Exit time'])

        // Get date string for daily counter tracking
        const tradeDate = DateTime.fromJSDate(date1).toISODate() || ''

        // Check if we need to reset counter for new day
        let accountCounter = dailyCounters.get(accountName)
        if (!accountCounter || accountCounter.currentDate !== tradeDate) {
            accountCounter = { currentDate: tradeDate, counter: 1 }
            dailyCounters.set(accountName, accountCounter)
        } else {
            accountCounter.counter++
        }

        // Generate extendId with daily counter (resets to 1 each day)
        const extendId = `-${accountCounter.counter}`

        let nb_points = type === 'buy' ? closePrice - openPrice : openPrice - closePrice
        nb_points = parseFloat(nb_points.toFixed(2))

        const netProfit = profit - commission;

        const trade: TradesImport = {
            extendId,
            openDate: date1,
            closeDate: date2,
            symbol,
            type,
            lot: quantity,
            openPrice,
            closePrice,
            profit,  // Profit BRUT
            netProfit,  // Profit NET
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
            const tradeDay = DateTime.fromJSDate(trade.closeDate).toISODate();
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
