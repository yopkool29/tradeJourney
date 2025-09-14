import { DateTime } from "luxon";
import type { AccountInfoImport, AccountTrades, TradesImport } from '.';
import { round } from "~/utils";

export type MT5XlsRawRow = [
    openTime: string,      // "Time" (date/heure d'ouverture)
    position: string,      // "Position"
    symbol: string,        // "Symbol"
    type: string,          // "Type"
    volume: string,        // "Volume"
    openPrice: string,     // "Price" (prix ouverture)
    stopLoss: string,      // "S / L"
    takeProfit: string,    // "T / P"
    closeTime: string,     // "Time" (date/heure de clôture)
    closePrice: string,    // "Price" (prix fermeture)
    commission: string,    // "Commission"
    swap: string,          // "Swap"
    profit: string         // "Profit"
];

// ParserImport est un alias de AccountTrades pour la rétrocompatibilité
export type ParserImport = AccountTrades;

export function parseMT5Xls(
    rows: MT5XlsRawRow[],
    timezone: string,
    DEBUG = false
): ParserImport | null {
    const accountRow = rows.find(row =>
        row && row[0] && ["account:", "compte:"].some(k => row[0].toString().toLowerCase().includes(k))
    );

    if (!accountRow)
        return null;

    const accountInfoFname = accountRow[accountRow.length - 1];

    const accountInfoMatch = accountInfoFname.match(/^.*?(\d+)/);

    if (!accountInfoMatch || isNaN(parseInt(accountInfoMatch[1])))
        return null;

    const accountInfo: AccountInfoImport = {
        name: accountInfoMatch[1],
        fullname: accountInfoFname,
        tradingDays: []
    }

    const parseDate = (dateStr: string): Date => {
        const date = DateTime.fromFormat(dateStr, "yyyy.MM.dd HH:mm:ss", { zone: timezone });
        return date.isValid ? date.toJSDate() : new Date();
    }

    const positionsRowIdx = rows.findIndex(row =>
        row && row[0] && ["positions"].some(k => row[0].toString().toLowerCase().includes(k))
    )

    const ordersRowIdx = rows.findIndex(row =>
        row && row[0] && ["orders", "ordres"].some(k => row[0].toString().toLowerCase().includes(k))
    )

    if (positionsRowIdx === -1 || ordersRowIdx === -1 || ordersRowIdx <= positionsRowIdx)
        return null;
    const trades: TradesImport[] = [];
    for (let i = positionsRowIdx + 2; i < ordersRowIdx; i++) {
        const row = rows[i];
        if (!row || typeof row[0] !== 'string' || row[0].trim() === '') break;
        const [
            openTime,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            position,
            symbol,
            type,
            volume,
            openPrice,
            stopLoss,
            takeProfit,
            closeTime,
            closePrice,
            commission,
            swap,
            profit
        ] = row;
        if (!symbol || !['buy', 'sell'].includes(type?.toLowerCase()))
            continue;
        console.log(openTime)
        const trade: TradesImport = {
            openDate: parseDate(openTime),
            closeDate: parseDate(closeTime),
            symbol: symbol.trim(),
            type: (type || '').toLowerCase() as 'buy' | 'sell',
            lot: parseFloat((volume || '0').toString().replace(',', '.')),
            openPrice: parseFloat((openPrice || '0').toString().replace(',', '.')),
            closePrice: parseFloat((closePrice || '0').toString().replace(',', '.')),
            profit: parseFloat((profit || '0').toString().replace(',', '.')),
            profit_points: undefined,
            stopLoss: parseFloat((stopLoss || '0').toString().replace(',', '.')),
            takeProfit: parseFloat((takeProfit || '0').toString().replace(',', '.')),
            commission: parseFloat((commission || '0').toString().replace(',', '.')),
            exchange: parseFloat((swap || '0').toString().replace(',', '.')), // swap devient exchange
            screenshotUrl: null,
        };

        trade.profit = round(trade.profit + trade.commission, 2); // commission est déjà incluse dans profit, arrondi à 2 chiffres après la virgule

        // Validation et transformation via le schéma
        try {
            trades.push(trade);
        } catch {
            // Ignore les trades invalides
            continue;
        }
    }

    const tradingDays = new Set<string>();
    trades.forEach(trade => {
        const tradeDay = DateTime.fromJSDate(trade.openDate).toISODate();
        if (tradeDay)
            tradingDays.add(tradeDay);
    });

    accountInfo.tradingDays = [...tradingDays]

    if (DEBUG && accountInfo.tradingDays.length > 0) {
        console.log(`\n=== Import days (${accountInfo.tradingDays.length} days) ===`);
        console.log([...accountInfo.tradingDays].sort().join(', '));
    }

    return {
        trades: trades,
        accountInfo: accountInfo,
    };
}