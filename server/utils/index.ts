import fs from 'fs';
import path from 'path';
import type { InstrumentType } from '~/type';

export interface AccountInfoImport {
    name: string;
    fullname: string;
    tradingDays: string[];
}

export const getUploadPath = (userId: number, dbName: string): string => {
    return `./upload/user_${userId}_data/${dbName}`
}

export const getScreenshotUploadPath = (userId: number, dbName: string): string => {
    return `./upload/user_${userId}_data/${dbName}/screenshots`
}

export const getPluginUploadPath = (userId: number, dbName: string): string => {
    return `./upload/user_${userId}_data/${dbName}/plugins`
}

export interface AccountTrades<T = TradesImport> {
    accountInfo: AccountInfoImport;
    trades: T[];
}

export interface TradesImport {
    openDate: Date;
    closeDate: Date;
    extendId?: string;
    symbol: string;
    type: 'buy' | 'sell';
    lot: number;
    openPrice: number;
    closePrice: number;
    profit: number;  // Profit BRUT (avant déduction des commissions)
    netProfit?: number;  // Profit NET (après déduction des commissions)
    profit_points?: number;  // Optionnel car pas toujours présent dans les imports MT5
    mae?: number;
    mfe?: number;
    stopLoss: number;
    takeProfit: number;
    commission: number;
    exchange: number;
    screenshotUrl: string | null;
    // Options-specific fields
    instrumentType?: InstrumentType;
    strikePrice?: number;
    expirationDate?: string;
    optionType?: string;
    premium?: number;
    metadata?: string;
}

// export const updateFuturesTradesProfit = async (trades: TradesImport[], symbolFilter?: string) => {
//     try {
//         // Récupérer tous les symboles uniques
//         const uniqueSymbols = [...new Set(trades
//             .filter(trade => !symbolFilter || trade.symbol === symbolFilter)
//             .map(trade => trade.symbol)
//         )];

//         if (uniqueSymbols.length === 0) return;

//         // Récupérer les configurations pour tous les symboles en une seule requête
//         const symbolConfigs = await prisma.configSymbol.findMany({
//             where: {
//                 symbol: { in: uniqueSymbols },
//                 pricePerPoint: { gt: 0 }
//             }
//         });

//         // Préparer les mises à jour
//         const updates = symbolConfigs.flatMap(symbolConfig => {
//             // Filtrer les trades avec profit_points défini et appartenant au symbole
//             const validTrades = trades.filter((trade): trade is TradesImport & { profit_points: number } =>
//                 trade.symbol === symbolConfig.symbol &&
//                 trade.profit_points !== undefined
//             );

//             return validTrades.map(trade =>
//                 prisma.trade.updateMany({
//                     where: {
//                         symbol: trade.symbol,
//                         openDate: trade.openDate,
//                         closeDate: trade.closeDate,
//                     },
//                     data: {
//                         profit: trade.profit_points * symbolConfig.pricePerPoint
//                     }
//                 })
//             );
//         });

//         // Exécuter toutes les mises à jour en parallèle
//         if (updates.length > 0) {
//             await Promise.all(updates);
//         }
//     } catch (error) {
//         console.error('Erreur lors de la mise à jour des profits', error);
//         throw error;
//     }
// };


export const deleteFiles = (screenshotsToDelete: {
    id: number;
    url: string;
    createdAt: Date;
    tradeId: number;
}[], userId: number, dbName: string) => {
    for (const screenshot of screenshotsToDelete) {
        try {
            // Construire le chemin: ./upload/user_{userId}_data/{dbName}/screenshots
            const filePath = path.join(process.cwd(), 'upload', `user_${userId}_data`, dbName, 'screenshots', screenshot.url)
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
        } catch {
            console.error(`deleteFiles: Error deleting file ${screenshot.url}`)
        }
    }
}