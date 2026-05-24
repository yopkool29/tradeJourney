import { describe, it, expect } from 'vitest'
import { parseQuantowerExecutions } from '../server/utils/quantower-parser'
import { readFileSync } from 'fs'
import { ImportMode, formatDate } from '../utils/date-utils'

// Chemin vers le fichier CSV Quantower
const filePath = __dirname + '/../data/tests/quantower-trades.csv'

// Lire le fichier CSV
const csvContent = readFileSync(filePath, 'utf-8')

// Parser les données
const accountsData = parseQuantowerExecutions(csvContent, 'Europe/Paris', ImportMode.LOCAL, undefined)

if (accountsData.length === 0) {
    throw new Error('No account data found in the file')
}

// Afficher les trades finaux pour tous les comptes
console.log('\n=== TRADES FINAUX QUANTOWER ===')
console.log(`Total des comptes: ${accountsData.length}`)

for (const account of accountsData) {
    const { trades, accountInfo } = account;
    
    console.log(`\n--- Compte: ${accountInfo.name} ---`);
    console.log(`Total des trades: ${trades.length}`);
    
    // Afficher les détails des trades (max 20 par compte)
    for (let i = 0; i < Math.min(trades.length, 20); i++) {
        const trade = trades[i];
        const openTime = trade.openDate.toLocaleTimeString('fr-FR');
        const closeTime = trade.closeDate.toLocaleTimeString('fr-FR');
        const openDateStr = trade.openDate.toLocaleDateString('fr-FR');
        const closeDateStr = trade.closeDate.toLocaleDateString('fr-FR');
        
        console.log(`\nTrade #${i + 1}:`);
        console.log(`  Symbol: ${trade.symbol}`);
        console.log(`  Type: ${trade.type}`);
        console.log(`  Lot: ${trade.lot}`);
        console.log(`  Open: ${openDateStr} ${openTime} @ ${trade.openPrice}`);
        console.log(`  Close: ${closeDateStr} ${closeTime} @ ${trade.closePrice}`);
        console.log(`  Profit: ${trade.profit.toFixed(2)} (${trade.profit_points} points)`);
        console.log(`  Commission: ${trade.commission.toFixed(2)}`);
        console.log(`  ID: ${trade.extendId}`);
    }
}

// Pour les tests, on prend le premier compte
const firstAccount = accountsData[0]
const { trades, accountInfo } = firstAccount

describe('parseQuantowerExecutions', () => {
    it('should parse account info', () => {
        expect(accountInfo).toBeDefined()
        expect(accountInfo.name).toBeTruthy()
        expect(accountInfo.fullname).toBe(accountInfo.name)
        expect(Array.isArray(accountInfo.tradingDays)).toBe(true)
    })

    it('should parse trades from Quantower executions', () => {
        expect(Array.isArray(trades)).toBe(true)
        expect(trades.length).toBeGreaterThan(0)

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
            expect(typeof trade.profit).toBe('number')
            expect(typeof trade.commission).toBe('number')

            // Vérification des valeurs cohérentes
            expect(trade.lot).toBeGreaterThan(0)
            expect(trade.openPrice).toBeGreaterThan(0)
            expect(trade.closePrice).toBeGreaterThan(0)

            // Vérification que la date de clôture est après la date d'ouverture
            expect(trade.closeDate.getTime()).toBeGreaterThanOrEqual(trade.openDate.getTime())
        }
    })

    it('should have matching entry and exit for each trade', () => {
        // Vérifie que chaque trade a bien une entrée et une sortie
        trades.forEach(trade => {
            expect(trade.openDate).toBeDefined()
            expect(trade.closeDate).toBeDefined()
            expect(trade.openPrice).toBeDefined()
            expect(trade.closePrice).toBeDefined()
            expect(trade.openPrice).toBeGreaterThan(0)
            expect(trade.closePrice).toBeGreaterThan(0)
        })
    })

    it('should calculate profit points correctly', () => {
        trades.forEach(trade => {
            expect(trade.profit_points).toBeDefined()
            
            // Vérifier que les points de profit sont cohérents avec le type de trade
            const expectedPoints = trade.type === 'buy' 
                ? trade.closePrice - trade.openPrice 
                : trade.openPrice - trade.closePrice
            
            // Tolérance pour les arrondis
            expect(Math.abs(trade.profit_points! - expectedPoints)).toBeLessThan(0.01)
        })
    })

    it('should have valid commission values', () => {
        trades.forEach(trade => {
            expect(typeof trade.commission).toBe('number')
            expect(trade.commission).toBeGreaterThanOrEqual(0)
        })
    })

    it('should group trades by trading days', () => {
        expect(accountInfo.tradingDays.length).toBeGreaterThan(0)
        
        // Vérifier que les jours sont au format ISO
        accountInfo.tradingDays.forEach(day => {
            expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        })
        
        // Vérifier que les jours sont triés
        const sortedDays = [...accountInfo.tradingDays].sort()
        expect(accountInfo.tradingDays).toEqual(sortedDays)
    })

    it('should handle multiple accounts if present', () => {
        accountsData.forEach(account => {
            expect(account.accountInfo).toBeDefined()
            expect(account.accountInfo.name).toBeTruthy()
            expect(Array.isArray(account.trades)).toBe(true)
        })
    })
})

describe('Date Parsing Comparison (Quantower)', () => {
    it('should produce consistent UTC dates for LOCAL vs UTC+2 import', () => {
        const infosLocal = parseQuantowerExecutions(csvContent, 'Europe/Paris', ImportMode.LOCAL)![0];
        const firstTradeLocal = infosLocal.trades[0];

        const infosUtcPlus2 = parseQuantowerExecutions(csvContent, '2', ImportMode.UTC)![0];
        const firstTradeUtcPlus2 = infosUtcPlus2.trades[0];

        // Les dates d'octobre sont en heure d'été (UTC+2)
        expect(firstTradeLocal.openDate.getTime()).toEqual(firstTradeUtcPlus2.openDate.getTime());

        const infosUtcPlus3 = parseQuantowerExecutions(csvContent, '3', ImportMode.UTC)![0];
        const firstTradeUtcPlus3 = infosUtcPlus3.trades[0];
        expect(firstTradeUtcPlus3.openDate.getTime()).toBeLessThan(firstTradeLocal.openDate.getTime());

        console.log(`\n--- Quantower Date Comparison ---`);
        console.log(`Input (as Europe/Paris) -> UTC -> Display (in Europe/Paris): ${formatDate(firstTradeLocal.openDate, 'Europe/Paris')}`);
        console.log(`Input (as UTC+2)        -> UTC -> Display (in Europe/Paris): ${formatDate(firstTradeUtcPlus2.openDate, 'Europe/Paris')}`);
        console.log(`Input (as UTC+3)        -> UTC -> Display (in Europe/Paris): ${formatDate(firstTradeUtcPlus3.openDate, 'Europe/Paris')}`);
    });
});
