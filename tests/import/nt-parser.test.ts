import { describe, it, expect } from 'vitest'
import { parseNTExecutions } from '../../server/utils/nt-parser'
import { readFileSync } from 'fs'
import { ImportMode, formatDate } from '../../utils/date-utils'
import { generateUniqueId } from '../../schema/trade'

// Chemin vers le fichier CSV d'exécution
// const filePath = __dirname + '/../data/tests/NinjaTrader Grid 2026-05-28 12-35.csv'
const filePath = __dirname + '/../../data/tests/ninjatrader-grid-2026-02-10.csv'

// Lire le fichier CSV
const csvContent = readFileSync(filePath, 'utf-8')

// Parser les données
const accountsData = parseNTExecutions(csvContent, 'Europe/Paris', ImportMode.LOCAL, undefined)

if (accountsData.length === 0) {
    throw new Error('No account data found in the file')
}

// Pour les tests, on prend le premier compte
const firstAccount = accountsData[0]
const { trades, accountInfo } = firstAccount

// Afficher les trades finaux (déjà agrégés dans parseNTExecutions)
console.log('\n=== TRADES FINAUX APRÈS AGRÉGATION ===')
console.log(`Total des trades agrégés: ${trades.length} dans ${accountInfo.name}`)

// Afficher les détails des trades
for (let i = 0; i < Math.min(trades.length, 20); i++) { // Limiter à 20 trades pour la lisibilité
    const trade = trades[i];
    const openTime = trade.openDate.toLocaleTimeString('fr-FR');
    const closeTime = trade.closeDate.toLocaleTimeString('fr-FR');
    
    // Simuler le uniqueId généré (accountId=1, importName=NT)
    const uniqueId = generateUniqueId('NT', 1, trade.symbol, trade.openDate, trade.closeDate, trade.extendId)
    console.log(`\nTrade #${i + 1}:`);
    console.log(`  extendId: ${trade.extendId}`);
    console.log(`  uniqueId: ${uniqueId}`);
    console.log(`  Symbol: ${trade.symbol}`);
    console.log(`  Type: ${trade.type}`);
    console.log(`  Lot: ${trade.lot}`);
    console.log(`  Open: ${openTime} @ ${trade.openPrice}`);
    console.log(`  Close: ${closeTime} @ ${trade.closePrice}`);
    console.log(`  Profit: ${trade.profit.toFixed(2)} (${trade.profit_points} points)`);
    console.log(`  ID: ${trade.extendId}`);
}

describe('parseNTExecutions', () => {
    it('should parse account info', () => {
        expect(accountInfo).toBeDefined()
        expect(accountInfo.name).toBeTruthy()
        expect(accountInfo.fullname).toBe(accountInfo.name)
    })

    it('should parse trades from NinjaTrader executions', () => {
        expect(Array.isArray(trades)).toBe(true)

        if (trades.length > 0) {
            const trade = trades[0]

            // Vérification des propriétés de base
            expect(trade).toHaveProperty('openDate')
            expect(trade).toHaveProperty('closeDate')
            expect(trade).toHaveProperty('symbol')
            expect(trade).toHaveProperty('type')
            expect(trade).toHaveProperty('lot')
            expect(trade).toHaveProperty('openPrice')
            expect(trade).toHaveProperty('closePrice')
            expect(trade).toHaveProperty('profit')
            expect(trade).toHaveProperty('commission')
            expect(trade).toHaveProperty('exchange')
            expect(trade).toHaveProperty('stopLoss')
            expect(trade).toHaveProperty('takeProfit')
            expect(trade).toHaveProperty('screenshotUrl')

            // Vérification des types
            expect(trade.openDate instanceof Date).toBe(true)
            expect(trade.closeDate instanceof Date).toBe(true)
            expect(['buy', 'sell']).toContain(trade.type)
            expect(typeof trade.lot).toBe('number')
            expect(typeof trade.openPrice).toBe('number')
            expect(typeof trade.closePrice).toBe('number')
            expect(['number', 'undefined']).toContain(typeof trade.profit)

            // Vérification des valeurs cohérentes
            expect(trade.lot).toBeGreaterThan(0)
            expect(trade.openPrice).toBeGreaterThan(0)
            expect(trade.closePrice).toBeGreaterThan(0)

            // Vérification que la date de clôture est après la date d'ouverture
            expect(trade.closeDate.getTime()).toBeGreaterThan(trade.openDate.getTime())
        }
    })

    it('should have matching entry and exit for each trade', () => {
        // Vérifie que chaque trade a bien une entrée et une sortie
        trades.forEach(trade => {
            expect(trade.openDate).toBeDefined()
            expect(trade.closeDate).toBeDefined()
            expect(trade.openPrice).toBeDefined()
            expect(trade.closePrice).toBeDefined()
        })
    })
})

describe('Date Parsing Comparison (NinjaTrader)', () => {
    it('should produce consistent UTC dates for LOCAL vs UTC+1 import', () => {
        const infosLocal = parseNTExecutions(csvContent, 'Europe/Paris', ImportMode.LOCAL)![0];
        const firstTradeLocal = infosLocal.trades[0];

        // Février = heure d'hiver = UTC+1 pour Europe/Paris
        const infosUtcPlus1 = parseNTExecutions(csvContent, '1', ImportMode.UTC)![0];
        const firstTradeUtcPlus1 = infosUtcPlus1.trades[0];

        expect(firstTradeLocal.openDate.getTime()).toEqual(firstTradeUtcPlus1.openDate.getTime());

        const infosUtcPlus2 = parseNTExecutions(csvContent, '2', ImportMode.UTC)![0];
        const firstTradeUtcPlus2 = infosUtcPlus2.trades[0];
        expect(firstTradeUtcPlus2.openDate.getTime()).toBeLessThan(firstTradeLocal.openDate.getTime());

        console.log(`\n--- NT Date Comparison ---`);
        console.log(`Input (as Europe/Paris) -> UTC -> Display (in Europe/Paris): ${formatDate(firstTradeLocal.openDate, 'Europe/Paris')}`);
        console.log(`Input (as UTC+1)        -> UTC -> Display (in Europe/Paris): ${formatDate(firstTradeUtcPlus1.openDate, 'Europe/Paris')}`);
        console.log(`Input (as UTC+2)        -> UTC -> Display (in Europe/Paris): ${formatDate(firstTradeUtcPlus2.openDate, 'Europe/Paris')}`);
    });
});
