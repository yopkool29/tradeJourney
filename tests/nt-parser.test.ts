import { describe, it, expect } from 'vitest'
import { parseNTExecutions } from '../server/utils/nt-parser'
import { readFileSync } from 'fs'

// Chemin vers le fichier CSV d'exécution
// const filePath = __dirname + '/../data/NinjaTrader Grid 2025-06-27 06-15.csv'
// const filePath = __dirname + '/../data/NinjaTrader Grid 2025-07-03 12-44 .csv'
// const filePath = __dirname + '/../data/NinjaTrader Grid 2025-07-16 09-02 .csv'
const filePath = __dirname + '/../data/NinjaTrader Grid 2025-07-25 12-36 .csv'

// Lire le fichier CSV
const csvContent = readFileSync(filePath, 'utf-8')

// Parser les données
const accountsData = parseNTExecutions(csvContent, 'Europe/Paris', true)

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
    
    console.log(`\nTrade #${i + 1}:`);
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
