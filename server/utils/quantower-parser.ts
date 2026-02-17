import { DateTime } from "luxon";
import type { AccountTrades, TradesImport } from './index';
import { parseQuantowerDate, toISODate, ImportMode } from '~/utils/date-utils';

export interface QuantowerRawExecution {
    'Account': string;
    'Date/Time': string;
    'Symbol': string;
    'Side': string;
    'Order type': string;
    'Quantity': string;
    'Price': string;
    'Gross P/L': string;
    'Fee': string;
    'Net P/L': string;
    'Connection name': string;
}

export type QuantowerParserImport = AccountTrades[];

/**
 * Agrège les trades Quantower qui sont au même moment (à 2-3 secondes près) sur le même actif
 * et avec des prix quasiment identiques, en additionnant les lots.
 */
function aggregateQuantowerTrades(trades: TradesImport[], timeThresholdMs = 3000): TradesImport[] {
    if (trades.length <= 1) return trades;

    // Trier les trades par symbole, type, date d'ouverture et date de fermeture
    const sortedTrades = [...trades].sort((a, b) => {
        if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        const openTimeDiff = a.openDate.getTime() - b.openDate.getTime();
        if (openTimeDiff !== 0) return openTimeDiff;
        return a.closeDate.getTime() - b.closeDate.getTime();
    });

    const aggregatedTrades: TradesImport[] = [];
    let currentGroup: TradesImport[] = [sortedTrades[0]];

    for (let i = 1; i < sortedTrades.length; i++) {
        const currentTrade = sortedTrades[i];
        const previousTrade = currentGroup[currentGroup.length - 1];

        const sameSymbol = currentTrade.symbol === previousTrade.symbol;
        const sameType = currentTrade.type === previousTrade.type;
        const timeDiffOpen = Math.abs(currentTrade.openDate.getTime() - previousTrade.openDate.getTime());
        const timeDiffClose = Math.abs(currentTrade.closeDate.getTime() - previousTrade.closeDate.getTime());

        if (sameSymbol && sameType && timeDiffOpen <= timeThresholdMs && timeDiffClose <= timeThresholdMs) {
            currentGroup.push(currentTrade);
        } else {
            aggregatedTrades.push(aggregateTradeGroup(currentGroup));
            currentGroup = [currentTrade];
        }
    }

    if (currentGroup.length > 0) {
        aggregatedTrades.push(aggregateTradeGroup(currentGroup));
    }

    return aggregatedTrades;
}

function aggregateTradeGroup(tradeGroup: TradesImport[]): TradesImport {
    if (tradeGroup.length === 1) return tradeGroup[0];

    const firstTrade = tradeGroup[0];
    
    let totalLot = 0;
    let totalProfit = 0;
    let totalCommission = 0;
    let totalExchange = 0;
    
    let earliestOpenDate = firstTrade.openDate;
    let latestCloseDate = firstTrade.closeDate;
    
    for (const trade of tradeGroup) {
        totalLot += trade.lot;
        totalProfit += trade.profit;
        totalCommission += trade.commission;
        totalExchange += trade.exchange;
        
        if (trade.openDate < earliestOpenDate) {
            earliestOpenDate = trade.openDate;
        }
        if (trade.closeDate > latestCloseDate) {
            latestCloseDate = trade.closeDate;
        }
    }
    
    const openPrice = firstTrade.openPrice;
    const closePrice = firstTrade.closePrice;
    
    let profit_points = firstTrade.type === 'buy' 
        ? closePrice - openPrice 
        : openPrice - closePrice;
    profit_points = parseFloat(profit_points.toFixed(2));
    
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

export function parseQuantowerCsv(csvContent: string): QuantowerRawExecution[] {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map(line => {
        // Parse CSV with quoted values
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        return headers.reduce((obj, header, index) => {
            (obj as any)[header] = values[index] || '';
            return obj;
        }, {} as QuantowerRawExecution);
    });
}

/**
 * Parse Quantower CSV exports and reconstruct trades from executions
 * Dans Quantower, les lignes avec Gross P/L non nul sont les fermetures de trades
 */
export function parseQuantowerExecutions(csvContent: string, timezone: string, importMode: ImportMode, accountTimezones?: Map<string, { timezone: string; importMode: ImportMode }>, DEBUG = false): QuantowerParserImport {
    const finalImportMode = importMode;
    const rows = parseQuantowerCsv(csvContent);

    if (!rows || rows.length === 0) {
        return [];
    }

    const accountTrades = new Map<string, TradesImport[]>();

    const parseNumber = (numStr: string): number => {
        if (!numStr) return 0;
        return parseFloat(numStr.replace(/[^\d,-]+/g, '').replace(',', '.'));
    };

    const parseCurrency = (currencyStr: string): number => {
        if (!currencyStr) return 0;
        return parseFloat(currencyStr.replace(/[^\d,-]+/g, '').replace(',', '.'));
    };

    // Sort rows by date (chronological order) - use default timezone for sorting
    const sortedRows = [...rows].sort((a, b) => {
        const dateA = parseQuantowerDate(a['Date/Time'], finalImportMode, timezone);
        const dateB = parseQuantowerDate(b['Date/Time'], finalImportMode, timezone);
        return dateA.getTime() - dateB.getTime();
    });

    // Track open executions for each account and symbol (FIFO queue)
    const openExecutions = new Map<string, QuantowerRawExecution[]>();

    for (let i = 0; i < sortedRows.length; i++) {
        const row = sortedRows[i];
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
            return parseQuantowerDate(dateStr, effectiveImportMode, effectiveTimezone);
        };

        const symbol = row['Symbol'];
        const grossPL = parseCurrency(row['Gross P/L']);
        const positionKey = `${accountName}_${symbol}`;

        // Si Gross P/L est non nul, c'est une fermeture de trade
        if (grossPL !== 0) {
            // Chercher l'exécution d'ouverture correspondante
            const openExecsForPosition = openExecutions.get(positionKey) || [];
            
            if (openExecsForPosition.length > 0) {
                // Prendre la première exécution d'ouverture (FIFO)
                const openExec = openExecsForPosition.shift()!;
                
                // Créer le trade
                const trade = createTrade(
                    openExec,
                    row,
                    Math.abs(parseNumber(row['Quantity'])),
                    parseDate,
                    parseNumber,
                    parseCurrency
                );
                
                accountTrades.get(accountName)!.push(trade);
                
                // Mettre à jour la liste des exécutions ouvertes
                if (openExecsForPosition.length === 0) {
                    openExecutions.delete(positionKey);
                } else {
                    openExecutions.set(positionKey, openExecsForPosition);
                }
            } else if (DEBUG) {
                console.warn(`No matching open execution found for close at ${row['Date/Time']} on ${symbol}`);
            }
        } else {
            // Gross P/L est nul, c'est une ouverture de position
            if (!openExecutions.has(positionKey)) {
                openExecutions.set(positionKey, []);
            }
            openExecutions.get(positionKey)!.push(row);
        }
    }

    const result: AccountTrades[] = [];

    for (const [accountName, trades] of accountTrades.entries()) {
        // Agréger les trades similaires (même symbole, type, et temps proche)
        const aggregatedTrades = aggregateQuantowerTrades(trades);
        
        result.push({
            accountInfo: {
                name: accountName,
                fullname: accountName,
                tradingDays: []
            },
            trades: aggregatedTrades
        });
    }

    // Setup trading days
    result.forEach(account => {
        const tradingDays = new Set<string>();
        account.trades.forEach(trade => {
            const tradeDay = DateTime.fromJSDate(trade.closeDate).toISODate();
            if (tradeDay)
                tradingDays.add(tradeDay);
        });
        account.accountInfo.tradingDays = [...tradingDays].sort();
    });

    if (DEBUG && result.length > 0) {
        console.log(`\n=== Quantower Import Summary ===`);
        result.forEach(account => {
            console.log(`Account: ${account.accountInfo.name}`);
            console.log(`Trades: ${account.trades.length}`);
            console.log(`Trading days: ${account.accountInfo.tradingDays.length}`);
            console.log(`Days: ${account.accountInfo.tradingDays.join(', ')}`);
        });
    }

    return result;
}

function createTrade(
    openExec: QuantowerRawExecution,
    closeExec: QuantowerRawExecution,
    quantity: number,
    parseDate: (dateStr: string) => Date,
    parseNumber: (numStr: string) => number,
    parseCurrency: (currencyStr: string) => number
): TradesImport {
    const openPrice = parseNumber(openExec['Price']);
    const closePrice = parseNumber(closeExec['Price']);
    const openDate = parseDate(openExec['Date/Time']);
    const closeDate = parseDate(closeExec['Date/Time']);
    const symbol = openExec['Symbol'];
    
    // Determine trade type based on the CLOSING execution's side (inversed logic)
    // If closing with Sell → it was a Buy (long) position
    // If closing with Buy → it was a Sell (short) position
    const type = closeExec['Side'] === 'Sell' ? 'buy' : 'sell' as const;
    
    // Use the quantity from the opening execution
    const actualQuantity = Math.abs(parseNumber(openExec['Quantity']))
    
    // Calculate profit points
    let profit_points = type === 'buy' 
        ? closePrice - openPrice 
        : openPrice - closePrice;
    profit_points = parseFloat(profit_points.toFixed(2));
    
    // Calculate profit and commission
    const openFee = Math.abs(parseCurrency(openExec['Fee']));
    const closeFee = Math.abs(parseCurrency(closeExec['Fee']));
    
    // Utiliser les fees complets des exécutions
    const totalCommission = openFee + closeFee;
    
    // Use the Gross P/L directly from the CSV (already calculated by Quantower)
    // This is more accurate as it accounts for the correct point values for each instrument
    const profit = parseCurrency(closeExec['Gross P/L']);
    
    const tradeId = `${openDate.getTime()}_${symbol}_${type}`;
    
    return {
        extendId: tradeId,
        openDate,
        closeDate,
        symbol,
        type,
        lot: actualQuantity,
        openPrice,
        closePrice,
        profit,
        profit_points,
        stopLoss: 0,
        takeProfit: 0,
        commission: totalCommission,
        exchange: 0,
        screenshotUrl: null
    };
}
