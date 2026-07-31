import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
	acquireTestDatabase,
	releaseTestDatabase
} from './utils/test-database'
import {
	getSessionCookie,
	BASE_URL
} from './utils/test-helpers'

describe('Database Integration - Import Standard CSV', () => {
	let testDbId: number
	const filePath = resolve(process.cwd(), 'data/tests/mt5-standard-1214585.csv')

	beforeAll(async () => {
		const db = await acquireTestDatabase()
		testDbId = db.id
	}, 30000)

	afterAll(async () => {
		await releaseTestDatabase(testDbId)
	})

	it('should import trades from standard CSV file', async () => {
		const fileBuffer = readFileSync(filePath)

		const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
		const encoder = new TextEncoder()

		// Build multipart body manually
		const fields = [
			{ name: 'reportType', value: 'standard' },
			{ name: 'importMode', value: 'utc' },
			{ name: 'timezone', value: 'UTC' },
			{ name: 'keepExistingTrades', value: 'false' },
			{ name: 'instrumentType', value: 'Any' },
			{ name: 'dayTagIds', value: '[]' },
			{ name: 'tradeTagIds', value: '[]' },
		]

		let body = new Uint8Array(0)

		for (const field of fields) {
			const part = encoder.encode(
				`--${boundary}\r\n` +
				`Content-Disposition: form-data; name="${field.name}"\r\n\r\n` +
				`${field.value}\r\n`
			)
			const combined = new Uint8Array(body.length + part.length)
			combined.set(body, 0)
			combined.set(part, body.length)
			body = combined
		}

		const fileHeader = encoder.encode(
			`--${boundary}\r\n` +
			`Content-Disposition: form-data; name="file"; filename="mt5-standard-1214585.csv"\r\n` +
			`Content-Type: text/csv\r\n\r\n`
		)
		const fileFooter = encoder.encode(`\r\n--${boundary}--\r\n`)

		const combined = new Uint8Array(body.length + fileHeader.length + fileBuffer.length + fileFooter.length)
		combined.set(body, 0)
		combined.set(fileHeader, body.length)
		combined.set(new Uint8Array(fileBuffer), body.length + fileHeader.length)
		combined.set(fileFooter, body.length + fileHeader.length + fileBuffer.length)
		body = combined

		const response = await fetch(`${BASE_URL}/api/import`, {
			method: 'POST',
			headers: {
				cookie: getSessionCookie(),
				'Content-Type': `multipart/form-data; boundary=${boundary}`
			},
			body
		})

		const result = await response.json()
		expect(response.status).toBe(200)
		expect(result.success).toBe(true)
		// CSV has 4 trades, 1 has closePrice=0 so it is rejected by Zod validation
		expect(result.countUpdated).toBe(3)
		expect(result.countDiscard).toBe(1)
	})

	it('should verify imported trades exist with correct prices', async () => {
		const rawResult = await $fetch(`${BASE_URL}/api/trades?limit=100`)
		const trades = Array.isArray(rawResult) ? rawResult : []

		expect(trades.length).toBe(3)

		// Sort by openDate to match CSV order (excluding the rejected open trade)
		const sorted = trades.sort((a: { openDate: string | Date }, b: { openDate: string | Date }) =>
			new Date(a.openDate).getTime() - new Date(b.openDate).getTime()
		)

		// Gold trade 1: openPrice=5064.59, closePrice=5068.3
		expect(sorted[0].symbol).toBe('GOLD')
		expect(sorted[0].openPrice).toBe(5064.59)
		expect(sorted[0].closePrice).toBe(5068.3)
		expect(sorted[0].lot).toBe(0.01)
		expect(sorted[0].type).toBe('buy')

		// Gold trade 2: openPrice=5064.61, closePrice=5064.6
		expect(sorted[1].symbol).toBe('GOLD')
		expect(sorted[1].openPrice).toBe(5064.61)
		expect(sorted[1].closePrice).toBe(5064.6)
		expect(sorted[1].lot).toBe(0.01)

		// DJ30 trade: openPrice=49382.73, closePrice=49276.28
		expect(sorted[2].symbol).toBe('DJ30')
		expect(sorted[2].openPrice).toBe(49382.73)
		expect(sorted[2].closePrice).toBe(49276.28)
		expect(sorted[2].lot).toBe(0.2)
	})

	it('should verify account was created', async () => {
		const { fetchAccounts } = useAccount()
		const accounts = await fetchAccounts()
		expect(accounts.length).toBe(1)
		expect(accounts[0].name).toBe('1514585')
		expect(accounts[0].displayName).toBe('1514585')
		expect(accounts[0].fullname).toBe('MetaTrader 5')
	})

	it('should verify importName and dates on trades', async () => {
		const { fetchTrades } = useTrades()
		const trades = await fetchTrades({}, 100)
		expect(trades.length).toBe(3)

		for (const trade of trades) {
			expect(trade.importName).toBe('MT5Export')
		}

		// Gold trade 1: 2026-02-12T14:34:13 → 2026-02-12T14:36:13
		const gold1 = trades.find(t => t.symbol === 'GOLD' && t.openPrice === 5064.59)
		expect(gold1).toBeDefined()
		expect(new Date(gold1!.openDate).toISOString()).toContain('2026-02-12T14:34:13')
		expect(new Date(gold1!.closeDate).toISOString()).toContain('2026-02-12T14:36:13')

		// DJ30 trade: 2026-02-13T08:18:31 → 2026-02-13T13:08:04
		const dj30 = trades.find(t => t.symbol === 'DJ30')
		expect(dj30).toBeDefined()
		expect(new Date(dj30!.openDate).toISOString()).toContain('2026-02-13T08:18:31')
		expect(new Date(dj30!.closeDate).toISOString()).toContain('2026-02-13T13:08:04')
	})

	it('should verify symbols were created', async () => {
		const { fetchSymbols } = useSymbols()
		const symbols = await fetchSymbols()
		expect(symbols.length).toBe(2)
		const names = symbols.map((s: { symbol: string }) => s.symbol).sort()
		expect(names).toEqual(['DJ30', 'GOLD'])
	})
})
