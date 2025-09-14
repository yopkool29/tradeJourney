import { describe, it, expect } from 'vitest'
import { parseMT5Xls } from '../server/utils/mt5-parser'
import type { MT5XlsRawRow } from '../server/utils/mt5-parser'
import * as XLSX from 'xlsx'

const filePath = __dirname + '/../data/ReportHistory-3000078208.xlsx'
const workbook = XLSX.readFile(filePath)
const sheetName = workbook.SheetNames[0]
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as MT5XlsRawRow[]

// Passe les lignes extraites à la fonction de parsing XLS
const infos = parseMT5Xls(rows, 'Europe/Paris', true)

if (!infos) {
    throw new Error('Failed to parse MT5 XLS report')
}

const trades = infos!.trades
trades.forEach(t => {
    console.log(new Date(t['openDate']));
})

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
        expect(t.commission).toBeLessThan(0);
        expect(t.stopLoss).toBeGreaterThanOrEqual(0);
        expect(t.takeProfit).toBeGreaterThanOrEqual(0);
        expect(t.screenshotUrl).toBeNull();
    })
})
