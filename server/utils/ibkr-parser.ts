import { DateTime } from "luxon";
import type { AccountTrades, TradesImport, AccountInfoImport } from './index';
import { parseIBKRFlexQueryActivityDate } from '~/utils/date-utils';
import type { ImportMode } from '~/utils/date-utils';
import { parseCSVLine } from './csv-utils';

export interface IBKRRawTrade {
    'Account': string;
    'DateTime': string;
    'Symbol': string;
    'Quantity': string;
    'TradePrice': string;
    'IBCommission': string;
    'NetCash': string;
    'Side': string;
    'CurrencyPrimary': string;
    'FifoPnlRealized': string;  // Used to detect closing trades
    'OrigTradePrice': string;   // Original trade price (0 for opening trades)
    'OrigTradeDate': string;    // Original trade date (empty for opening trades)
    [key: string]: string;
}

export type IBKRParserImport = AccountTrades[];

/**
 * Parse les exports Flex Query d'Interactive Brokers
 * Format CSV avec colonnes comme Date/Time, Exchange, Symbol, Quantity, TradePrice, etc.
 */
export function parseIBKRTrades(
    csvContent: string,
    timezone: string,
    importMode: ImportMode,
    accountTimezones?: Map<string, { timezone: string; importMode: ImportMode }>,
    DEBUG = false
): IBKRParserImport {
    const finalImportMode = importMode;
    const rows = parseIBKRCsv(csvContent);

    if (!rows || rows.length === 0) {
        return [];
    }

    const accountTrades = new Map<string, TradesImport[]>();
    const result: AccountTrades[] = [];

    // Trier les exécutions par date (ordre chronologique)
    const sortedRows = [...rows].sort((a, b) => {
        const dateA = parseIBKRFlexQueryActivityDate(a['DateTime'], finalImportMode, timezone);
        const dateB = parseIBKRFlexQueryActivityDate(b['DateTime'], finalImportMode, timezone);
        return dateA.getTime() - dateB.getTime();
    });

    // Tracker les positions ouvertes pour chaque compte et symbole (FIFO queue)
    // Structure: Map<"accountName_symbol", Array<{exec: IBKRRawTrade, remainingQty: number}>>
    // remainingQty permet de gérer les fermetures partielles
    const openPositions = new Map<string, Array<{exec: IBKRRawTrade, remainingQty: number}>>();

    for (const row of sortedRows) {
        const accountName = row['Account'];
        if (!accountName) {
            continue;
        }

        // Ignorer les lignes sans symbole ou sans quantité
        const symbol = row['Symbol'];
        const quantityStr = row['Quantity'];
        if (!symbol || !quantityStr) {
            continue;
        }

        // Ignorer les paires forex (contiennent un point, ex: USD.CHF, EUR.USD)
        if (symbol.includes('.')) {
            continue;
        }

        if (!accountTrades.has(accountName)) {
            accountTrades.set(accountName, []);
        }

        // Utiliser la timezone du compte si disponible
        const accountTimezoneInfo = accountTimezones?.get(accountName)
        const effectiveTimezone = accountTimezoneInfo?.timezone ?? timezone
        const effectiveImportMode = accountTimezoneInfo?.importMode ?? finalImportMode

        console.log(`parseIBKRTrades: Processing account ${accountName} with timezone ${effectiveTimezone} and import mode ${effectiveImportMode}`)

        const parseDate = (dateStr: string): Date => {
            return parseIBKRFlexQueryActivityDate(dateStr, effectiveImportMode, effectiveTimezone);
        };

        const positionKey = `${accountName}_${symbol}`;
        const fifoPnl = parseFloat(row['FifoPnlRealized'] || '0');
        
        // Utiliser FifoPnlRealized pour détecter les fermetures
        // Si FifoPnlRealized != 0, c'est une fermeture de position
        const isClosing = fifoPnl !== 0;
        
        const openQueue = openPositions.get(positionKey) || [];
        const currentQty = Math.abs(parseFloat(row['Quantity']));

        if (isClosing) {
            // C'est une fermeture de position
            let remainingCloseQty = currentQty;
            
            while (remainingCloseQty > 0 && openQueue.length > 0) {
                const openPosition = openQueue[0];
                const qtyToClose = Math.min(remainingCloseQty, openPosition.remainingQty);
                
                // Créer un trade pour cette fermeture (partielle ou complète)
                const trade = createIBKRTrade(
                    openPosition.exec,
                    row,
                    parseDate,
                    qtyToClose
                );
                
                accountTrades.get(accountName)!.push(trade);
                
                // Mettre à jour les quantités
                openPosition.remainingQty -= qtyToClose;
                remainingCloseQty -= qtyToClose;
                
                // Si la position d'ouverture est complètement fermée, la retirer
                if (openPosition.remainingQty <= 0.0001) { // Tolérance pour les arrondis
                    openQueue.shift();
                }
            }
            
            // Si il reste de la quantité à fermer mais pas d'ouverture, c'est une position ouverte avant la période
            if (remainingCloseQty > 0.0001) {
                if (DEBUG) {
                    console.log(`⚠️  Closing ${remainingCloseQty} ${symbol} without opening (opened before import period)`);
                }
            }
            
            // Mettre à jour ou supprimer la position
            if (openQueue.length === 0) {
                openPositions.delete(positionKey);
            } else {
                openPositions.set(positionKey, openQueue);
            }
        } else {
            // C'est une ouverture de position (FifoPnlRealized = 0)
            openQueue.push({
                exec: row,
                remainingQty: currentQty
            });
            openPositions.set(positionKey, openQueue);
        }
    }

    // Créer les objets AccountTrades pour chaque compte
    for (const [accountName, trades] of accountTrades.entries()) {
        // Agréger les trades similaires (exécutions partielles du même ordre)
        const aggregatedTrades = aggregateSimilarTrades(trades, 5000); // 5 secondes de seuil
        
        // Calculer les jours de trading
        const tradingDays = new Set<string>();
        aggregatedTrades.forEach(trade => {
            const tradeDay = DateTime.fromJSDate(trade.closeDate).toISODate();
            if (tradeDay) tradingDays.add(tradeDay);
        });

        const accountInfo: AccountInfoImport = {
            name: accountName,
            fullname: accountName,
            tradingDays: [...tradingDays]
        };

        result.push({
            accountInfo,
            trades: aggregatedTrades
        });
    }

    if (DEBUG) {
        console.log(`\n=== IBKR Import Summary ===`);
        result.forEach(account => {
            console.log(`Account ${account.accountInfo.name}: ${account.trades.length} trades`);
        });
    }

    return result;
}

/**
 * Agrège les trades qui sont au même moment (à quelques secondes près) sur le même actif
 * et avec le même type, en additionnant les lots.
 * Cela permet de fusionner les exécutions partielles d'un même ordre.
 * @param trades Liste des trades à agréger
 * @param timeThresholdMs Seuil de temps en millisecondes (défaut: 5000ms)
 * @returns Liste des trades agrégés
 */
function aggregateSimilarTrades(
    trades: TradesImport[],
    timeThresholdMs = 5000
): TradesImport[] {
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
            // Ajouter au groupe actuel
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
        profit: parseFloat(totalProfit.toFixed(2)), // Arrondir pour éviter les erreurs de précision flottante
        profit_points,
        commission: totalCommission,
        exchange: totalExchange
    };
}

/**
 * Crée un trade IBKR à partir d'une exécution d'ouverture et d'une exécution de fermeture
 * @param openExec Exécution d'ouverture
 * @param closeExec Exécution de fermeture
 * @param parseDate Fonction de parsing de date
 * @param quantity Quantité du trade (peut être différente de la quantité de l'exécution en cas de fermeture partielle)
 */
function createIBKRTrade(
    openExec: IBKRRawTrade,
    closeExec: IBKRRawTrade,
    parseDate: (dateStr: string) => Date,
    quantity?: number
): TradesImport {
    const openPrice = parseFloat(parseFloat(openExec['TradePrice']).toFixed(3));
    const closePrice = parseFloat(parseFloat(closeExec['TradePrice']).toFixed(3));
    const openDate = parseDate(openExec['DateTime']);
    const closeDate = parseDate(closeExec['DateTime']);
    const symbol = openExec['Symbol'];
    
    // Déterminer le type de trade basé sur le side d'ouverture
    // BUY en ouverture = position longue (buy)
    // SELL en ouverture = position courte (sell)
    const type = openExec['Side'].toUpperCase() === 'BUY' ? 'buy' : 'sell';
    
    // Utiliser la quantité fournie ou celle de l'exécution d'ouverture
    const tradeQuantity = quantity ?? Math.abs(parseFloat(openExec['Quantity']));
    
    // Calculer les points de profit
    let profit_points = type === 'buy' 
        ? closePrice - openPrice 
        : openPrice - closePrice;
    profit_points = parseFloat(profit_points.toFixed(2));
    
    // Calculer les commissions proportionnellement à la quantité du trade
    const openExecQty = Math.abs(parseFloat(openExec['Quantity']));
    const closeExecQty = Math.abs(parseFloat(closeExec['Quantity']));
    const openCommission = Math.abs(parseFloat(openExec['IBCommission'] || '0')) * (tradeQuantity / openExecQty);
    const closeCommission = Math.abs(parseFloat(closeExec['IBCommission'] || '0')) * (tradeQuantity / closeExecQty);
    const totalCommission = openCommission + closeCommission;
    
    // Calculer le profit
    // Pour les actions, le profit = (closePrice - openPrice) * quantity pour un buy
    // ou (openPrice - closePrice) * quantity pour un sell
    const grossProfit = type === 'buy'
        ? (closePrice - openPrice) * tradeQuantity
        : (openPrice - closePrice) * tradeQuantity;
    
    // Arrondir à 2 décimales pour respecter la validation Zod (profit = argent)
    const netProfit = grossProfit - totalCommission;
    const profit = parseFloat(netProfit.toFixed(2));
    
    const tradeId = `${openDate.getTime()}_${symbol}_${type}`;
    
    return {
        extendId: tradeId,
        openDate,
        closeDate,
        symbol,
        type,
        lot: tradeQuantity,
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

/**
 * Parse le CSV IBKR en objets
 * Supporte le format Flex Query Activity avec lignes de contrôle (BOF, BOA, BOS, EOS, EOA, EOF)
 */
function parseIBKRCsv(csvContent: string): IBKRRawTrade[] {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    // Filtrer les lignes de contrôle IBKR (BOF, BOA, BOS, EOS, EOA, EOF)
    const dataLines = lines.filter(line => {
        const trimmed = line.trim();
        // Ignorer les lignes de contrôle qui commencent par "BOF", "BOA", "BOS", "EOS", "EOA", "EOF"
        return !trimmed.startsWith('"BOF"') &&
            !trimmed.startsWith('"BOA"') &&
            !trimmed.startsWith('"BOS"') &&
            !trimmed.startsWith('"EOS"') &&
            !trimmed.startsWith('"EOA"') &&
            !trimmed.startsWith('"EOF"');
    });

    if (dataLines.length === 0) return [];

    // Trouver la ligne d'en-têtes (celle qui contient "ClientAccountID" ou "DateTime")
    let headerLineIndex = 0;
    for (let i = 0; i < dataLines.length; i++) {
        if (dataLines[i].includes('ClientAccountID') || dataLines[i].includes('DateTime')) {
            headerLineIndex = i;
            break;
        }
    }

    // Parser les en-têtes
    const headerLine = dataLines[headerLineIndex];
    const headers = parseCSVLine(headerLine);

    // Parser les données (lignes après les en-têtes)
    return dataLines.slice(headerLineIndex + 1).map(line => {
        const values = parseCSVLine(line);
        const obj: IBKRRawTrade = {} as IBKRRawTrade;

        headers.forEach((header, index) => {
            const value = values[index] || '';
            // Mapper les colonnes du format Flex Query Activity
            if (header === 'ClientAccountID') {
                obj['Account'] = value;
            } else if (header === 'Buy/Sell') {
                obj['Side'] = value;
            } else if (header === 'CurrencyPrimary') {
                obj['CurrencyPrimary'] = value;
            } else {
                obj[header] = value;
            }
        });

        return obj;
    });
}

