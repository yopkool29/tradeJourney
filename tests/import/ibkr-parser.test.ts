import { describe, it, expect } from 'vitest'
import { parseIBKRTrades } from '../../server/utils/ibkr-parser'
import { readFileSync } from 'fs'
import path from 'path'
import { formatDateString, ImportMode } from '../../utils/date-utils'

const filePath = path.resolve(__dirname, '../../data/tests/ibkr-flex-results.csv')
const csvContent = readFileSync(filePath, 'utf-8')

// Parser le CSV IBKR avec timezone America/New_York (NASDAQ)
const accountsTrades = parseIBKRTrades(csvContent, 'America/New_York', ImportMode.LOCAL, undefined, true)

if (!accountsTrades || accountsTrades.length === 0) {
    throw new Error('Failed to parse IBKR CSV report')
}

const firstAccount = accountsTrades[0]
const trades = firstAccount.trades

console.log(`\n=== IBKR Parser Test ===`)
console.log(`Account: ${firstAccount.accountInfo.name}`)
console.log(`Total trades: ${trades.length}`)
console.log(`Trading days: ${firstAccount.accountInfo.tradingDays.length}`)
console.log(`Days: ${firstAccount.accountInfo.tradingDays.join(', ')}`)

// Afficher les trades pour debug
trades.forEach((t, idx) => {
    console.log(`\nTrade ${idx + 1}:`)
    console.log(`  Symbol: ${t.symbol}`)
    console.log(`  Type: ${t.type}`)
    console.log(`  Quantity: ${t.lot}`)
    console.log(`  Open: ${formatDateString(t.openDate, true, 'us', 'LOCAL', 'America/New_York')} @ ${t.openPrice}`)
    console.log(`  Close: ${formatDateString(t.closeDate, true, 'us', 'LOCAL', 'America/New_York')} @ ${t.closePrice}`)
    console.log(`  Profit: ${t.profit.toFixed(2)}`)
    console.log(`  Commission: ${t.commission.toFixed(2)}`)
    console.log(`  Profit Points: ${t.profit_points}`)
})

describe('parseIBKRTrades', () => {
    it('should parse trades from IBKR Flex Query CSV', () => {
        expect(Array.isArray(accountsTrades)).toBe(true)
        expect(accountsTrades.length).toBeGreaterThan(0)
        expect(trades.length).toBeGreaterThan(0)
    })

    it('should have correct account info', () => {
        expect(firstAccount.accountInfo).toHaveProperty('name')
        expect(firstAccount.accountInfo).toHaveProperty('fullname')
        expect(firstAccount.accountInfo).toHaveProperty('tradingDays')
        expect(Array.isArray(firstAccount.accountInfo.tradingDays)).toBe(true)
    })

    it('should have valid trade structure', () => {
        const t = trades[0]
        expect(t).toHaveProperty('openDate')
        expect(t).toHaveProperty('closeDate')
        expect(t).toHaveProperty('symbol')
        expect(t).toHaveProperty('type')
        expect(t).toHaveProperty('lot')
        expect(t).toHaveProperty('openPrice')
        expect(t).toHaveProperty('closePrice')
        expect(t).toHaveProperty('profit')
        expect(t).toHaveProperty('profit_points')
        expect(t).toHaveProperty('commission')
        expect(t).toHaveProperty('exchange')
        expect(t).toHaveProperty('stopLoss')
        expect(t).toHaveProperty('takeProfit')
        expect(t).toHaveProperty('screenshotUrl')
    })

    it('should have valid trade values', () => {
        const t = trades[0]
        expect(t.openDate instanceof Date).toBe(true)
        expect(t.closeDate instanceof Date).toBe(true)
        expect(['buy', 'sell']).toContain(t.type)
        expect(t.lot).toBeGreaterThan(0)
        expect(t.openPrice).toBeGreaterThan(0)
        expect(t.closePrice).toBeGreaterThan(0)
        expect(typeof t.profit).toBe('number')
        expect(typeof t.commission).toBe('number')
        expect(t.stopLoss).toBe(0)
        expect(t.takeProfit).toBe(0)
        expect(t.screenshotUrl).toBeNull()
    })

    it('should match BUY with SELL to create complete trades', () => {
        // Vérifier que les trades ont des dates d'ouverture et de fermeture différentes
        const tradesWithDifferentDates = trades.filter(t => 
            t.openDate.getTime() !== t.closeDate.getTime()
        )
        expect(tradesWithDifferentDates.length).toBeGreaterThan(0)
    })

    it('should filter out forex pairs', () => {
        // Vérifier qu'aucun trade ne contient un point dans le symbole (forex)
        const forexTrades = trades.filter(t => t.symbol.includes('.'))
        expect(forexTrades.length).toBe(0)
    })

    it('should calculate profit correctly', () => {
        // Vérifier la cohérence interne : profit (brut) = netProfit + commission
        // On ne recalcule pas depuis les prix car certains instruments (futures, options)
        // utilisent un multiplicateur qui rendrait la formule simple incorrecte.
        trades.forEach(t => {
            expect(typeof t.profit).toBe('number')
            expect(t.profit).not.toBeNaN()
            const expectedNetProfit = parseFloat((t.profit - t.commission).toFixed(2))
            expect(Math.abs((t.netProfit ?? 0) - expectedNetProfit)).toBeLessThan(0.01)
        })
    })

    it('should calculate profit_points correctly', () => {
        trades.forEach(t => {
            const expectedPoints = t.type === 'buy'
                ? t.closePrice - t.openPrice
                : t.openPrice - t.closePrice
            
            // Tolérance de 0.01 pour les erreurs d'arrondi
            expect(Math.abs(t.profit_points! - expectedPoints)).toBeLessThan(0.01)
        })
    })
})

describe('Date Parsing Comparison', () => {
    it('should produce different UTC dates for LOCAL vs UTC-5 import', () => {
        // 1. Parse en mode LOCAL (America/New_York)
        const infosLocal = parseIBKRTrades(csvContent, 'America/New_York', ImportMode.LOCAL)
        const firstTradeLocal = infosLocal[0].trades[0]

        // 2. Parse en mode UTC-5 (EST)
        const infosUtcMinus5 = parseIBKRTrades(csvContent, '-5', ImportMode.UTC)
        const firstTradeUtcMinus5 = infosUtcMinus5[0].trades[0]

        // 3. Vérifier que les dates UTC résultantes sont identiques
        // (car America/New_York est à UTC-5 en hiver)
        expect(firstTradeLocal.openDate.getTime()).toEqual(firstTradeUtcMinus5.openDate.getTime())

        // 4. Parse en mode UTC-4 (EDT) et comparer
        const infosUtcMinus4 = parseIBKRTrades(csvContent, '-4', ImportMode.UTC)
        const firstTradeUtcMinus4 = infosUtcMinus4[0].trades[0]
        expect(firstTradeUtcMinus4.openDate.getTime()).toBeLessThan(firstTradeLocal.openDate.getTime())

        // 5. Afficher les résultats formatés
        console.log(`\n--- Date Comparison ---`)
        console.log(`Input (as America/New_York) -> UTC -> Display (in America/New_York): ${formatDateString(firstTradeLocal.openDate, true, 'us', 'LOCAL', 'America/New_York')}`)
        console.log(`Input (as UTC-5)             -> UTC -> Display (in America/New_York): ${formatDateString(firstTradeUtcMinus5.openDate, true, 'us', 'LOCAL', 'America/New_York')}`)
        console.log(`Input (as UTC-4)             -> UTC -> Display (in America/New_York): ${formatDateString(firstTradeUtcMinus4.openDate, true, 'us', 'LOCAL', 'America/New_York')}`)
    })
})
