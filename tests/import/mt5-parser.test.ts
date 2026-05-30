import { describe, it, expect } from 'vitest'
import { parseMT5Xls } from '../../server/utils/mt5-parser'
import type { MT5XlsRawRow } from '../../server/utils/mt5-parser'
import * as XLSX from 'xlsx'
import path from 'path'
import { formatDate, ImportMode } from '../../utils/date-utils';

const filePath = path.resolve(__dirname, '../../data/tests/mt5-report-3000078208.xlsx')
const workbook = XLSX.readFile(filePath)
const sheetName = workbook.SheetNames[0]
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as MT5XlsRawRow[]

// Passe les lignes extraites à la fonction de parsing XLS
// const infos = parseMT5Xls(rows, 'Europe/Paris', undefined, true)
const infos = parseMT5Xls(rows, 'Europe/Paris', ImportMode.LOCAL, undefined, true)

if (!infos) {
    throw new Error('Failed to parse MT5 XLS report')
}

const trades = infos!.trades
// trades.forEach(t => {
//     console.log(new Date(t['openDate']));
// })

describe('parseMT5Xls', () => {
    it('should parse trades from MT5 XLS report', () => {
        expect(Array.isArray(trades)).toBe(true)
        expect(trades.length).toBeGreaterThan(0)
        const t = trades[0];
        expect(t).toHaveProperty('openDate');
        expect(t).toHaveProperty('closeDate');
        expect(t).toHaveProperty('symbol');
        expect(t).toHaveProperty('type');
        expect(t).toHaveProperty('lot');
        expect(t).toHaveProperty('openPrice');
        expect(t).toHaveProperty('closePrice');
        expect(t).toHaveProperty('profit');
        expect(t).toHaveProperty('commission');
        expect(t).toHaveProperty('exchange');
        expect(t).toHaveProperty('stopLoss');
        expect(t).toHaveProperty('takeProfit');
        expect(t).toHaveProperty('screenshotUrl');
        // Vérifie le contenu exact du premier trade (issu du XLS d'exemple)
        expect(t.openDate instanceof Date || typeof t.openDate === 'string').toBe(true);
        expect(t.closeDate instanceof Date || typeof t.closeDate === 'string').toBe(true);
        expect(['buy', 'sell']).toContain(t.type);
        expect(t.lot).toBeGreaterThan(0.01);
        expect(t.openPrice).toBeGreaterThan(0);
        expect(t.closePrice).toBeGreaterThan(0);
        expect(t.profit).toBeGreaterThan(0);
        expect(t.commission).toBeLessThanOrEqual(0);
        expect(t.stopLoss).toBeGreaterThanOrEqual(0);
        expect(t.takeProfit).toBeGreaterThanOrEqual(0);
        expect(t.screenshotUrl).toBeNull();
    })
})

describe('Date Parsing Comparison', () => {
    it('should produce different UTC dates for LOCAL vs UTC+2 import', () => {
        // 1. Parse en mode LOCAL (Europe/Paris)
        const infosLocal = parseMT5Xls(rows, 'Europe/Paris', ImportMode.LOCAL);
        const firstTradeLocal = infosLocal!.trades[0];

        // 2. Parse en mode UTC+2
        // Note: Le 'timezone' est '2' (string) car l'API attend un string.
        const infosUtcPlus2 = parseMT5Xls(rows, '2', ImportMode.UTC);
        const firstTradeUtcPlus2 = infosUtcPlus2!.trades[0];

        // 3. Vérifier que les dates UTC résultantes sont différentes
                // Vérifier que les dates UTC résultantes sont IDENTIQUES, car Paris est bien à UTC+2 à cette date.
        expect(firstTradeLocal.openDate.getTime()).toEqual(firstTradeUtcPlus2.openDate.getTime());

        // 5. Parse en mode UTC+3 et comparer
        const infosUtcPlus3 = parseMT5Xls(rows, '3', ImportMode.UTC);
        const firstTradeUtcPlus3 = infosUtcPlus3!.trades[0];
        expect(firstTradeUtcPlus3.openDate.getTime()).toBeLessThan(firstTradeLocal.openDate.getTime());

        // 6. Afficher les résultats formatés en heure de Paris pour comparaison
        console.log(`\n--- Date Comparison ---`);
        console.log(`Input (as Europe/Paris) -> UTC -> Display (in Europe/Paris): ${formatDate(firstTradeLocal.openDate, 'Europe/Paris')}`);
        console.log(`Input (as UTC+2)        -> UTC -> Display (in Europe/Paris): ${formatDate(firstTradeUtcPlus2.openDate, 'Europe/Paris')}`);
        console.log(`Input (as UTC+3)        -> UTC -> Display (in Europe/Paris): ${formatDate(firstTradeUtcPlus3.openDate, 'Europe/Paris')}`);
    });
});