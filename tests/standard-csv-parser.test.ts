import { describe, it, expect } from 'vitest'
import path from 'path'
import fs from 'fs'
import { TextDecoder } from 'util'
import { parseStandardCSV } from '../server/utils/standard-csv-parser'
import { ImportMode } from '../utils/date-utils'

const filePath = path.resolve(__dirname, '../data/tests/mt5-standard-1214585.csv')

const csvBuffer = fs.readFileSync(filePath)
// Auto-détecter UTF-16LE (null bytes) sinon fallback UTF-8
const csvContent = csvBuffer.includes(0x00)
    ? new TextDecoder('utf-16le').decode(csvBuffer)
    : csvBuffer.toString('utf-8')

console.log(csvContent)

describe('parseStandardCSV', () => {
    const parsed = parseStandardCSV(csvContent, 'UTC', ImportMode.UTC)

    it('should return at least one account with trades', () => {
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed.length).toBeGreaterThan(0)
        const account = parsed[0]
        expect(account).toHaveProperty('importName')
        expect(account).toHaveProperty('accountInfo')
        expect(account.accountInfo).toHaveProperty('name')
        expect(account.accountInfo).toHaveProperty('fullname')
        expect(Array.isArray(account.trades)).toBe(true)
        expect(account.trades.length).toBeGreaterThan(0)
    })

    it('should parse trade fields', () => {
        const trade = parsed[0].trades[0]
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
    })
})
