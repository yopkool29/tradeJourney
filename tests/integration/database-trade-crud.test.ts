import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { TradeType } from '~/schema/trade'
import type { AccountType } from '~/schema/account'
import { InstrumentType } from '~/type'
import { TEST_USER_PASSWORD } from './utils/test-helpers'
import { acquireTestDatabase, releaseTestDatabase } from './utils/test-database'

describe('Database Integration - Trade CRUD', () => {
	let testDbId: number
	let testAccount: AccountType | null = null
	let createdTrade: TradeType | null = null

	beforeAll(async () => {
		const db = await acquireTestDatabase()
		testDbId = db.id
	}, 30000)

	afterAll(async () => {
		await releaseTestDatabase(testDbId)
	})

	it('should create a test account', async () => {
		// @ts-expect-error global $fetch is stubbed in setup.ts
		testAccount = await $fetch('/api/account', {
			method: 'POST',
			body: {
				name: `test_account_${Date.now()}`,
				fullname: 'Test Account for Integration Tests',
				displayName: 'Test Account',
				aliases: ''
			}
		}) as AccountType

		console.log('Account created:', testAccount.id)
		expect(testAccount).toBeDefined()
		expect(testAccount.id).toBeDefined()
	})

	it('should create a trade', async () => {
		if (!testAccount) {
			throw new Error('No test account was created')
		}

		// @ts-expect-error global $fetch is stubbed in setup.ts
		createdTrade = await $fetch('/api/trades', {
			method: 'POST',
			body: {
				openDate: '2024-01-15T10:00:00.000Z',
				closeDate: '2024-01-15T11:00:00.000Z',
				symbol: 'TEST_SYMBOL',
				type: 'buy',
				lot: 1.0,
				openPrice: 100.0,
				closePrice: 101.0,
				profit: 100.0,
				netProfit: 95.0,
				profit_points: 1.0,
				instrumentType: InstrumentType.Stock,
				stopLoss: 99.0,
				takeProfit: 102.0,
				commission: 5.0,
				exchange: 0,
				note: 'Test trade created by integration test',
				active: true,
				accountId: testAccount.id,
				screenshots: []
			}
		}) as TradeType

		expect(createdTrade).toBeDefined()
		expect(createdTrade.id).toBeDefined()
		expect(createdTrade.symbol).toBe('TEST_SYMBOL')
		expect(createdTrade.type).toBe('buy')
		expect(createdTrade.lot).toBe(1.0)
		expect(createdTrade.profit).toBe(100.0)
		expect(createdTrade.note).toBe('Test trade created by integration test')
	})

	it('should fetch the created trade', async () => {
		if (!createdTrade) {
			throw new Error('No trade was created in previous test')
		}

		// @ts-expect-error global $fetch is stubbed in setup.ts
		const fetchedTrade = await $fetch(`/api/trades/${createdTrade.id}`) as TradeType

		expect(fetchedTrade).toBeDefined()
		expect(fetchedTrade.id).toBe(createdTrade.id)
		expect(fetchedTrade.symbol).toBe('TEST_SYMBOL')
		expect(fetchedTrade.note).toBe('Test trade created by integration test')
	})

	it('should update the trade', async () => {
		if (!createdTrade) {
			throw new Error('No trade was created in previous test')
		}

		// @ts-expect-error global $fetch is stubbed in setup.ts
		const updatedTrade = await $fetch(`/api/trades/${createdTrade.id}`, {
			method: 'PATCH',
			body: {
				id: createdTrade.id,
				note: 'Updated note from integration test',
				profit: 150.0,
				netProfit: 145.0,
				detailedNote: 'Detailed analysis of the trade setup and execution',
				screenshots: [{ url: 'https://example.com/test-screenshot.png' }]
			}
		}) as TradeType

		expect(updatedTrade).toBeDefined()
		expect(updatedTrade.id).toBe(createdTrade.id)
		expect(updatedTrade.note).toBe('Updated note from integration test')
		expect(updatedTrade.profit).toBe(150.0)
		expect(updatedTrade.netProfit).toBe(145.0)
		expect(updatedTrade.screenshots).toBeDefined()
		expect(updatedTrade.screenshots.length).toBe(1)
		expect(updatedTrade.screenshots[0].url).toBe('https://example.com/test-screenshot.png')
	})

	it('should fetch trades list and find our trade', async () => {
		// @ts-expect-error global $fetch is stubbed in setup.ts
		const rawResult = await $fetch('/api/trades', {
			query: {
				filters: JSON.stringify({ symbol: 'TEST_SYMBOL' }),
				showInactive: 'false',
				limit: '100'
			}
		}) as TradeType[]

		const trades = Array.isArray(rawResult) ? rawResult : []
		expect(trades.length).toBeGreaterThan(0)

		const foundTrade = trades.find(t => t.symbol === 'TEST_SYMBOL' && t.note === 'Updated note from integration test')
		expect(foundTrade).toBeDefined()
		expect((foundTrade!.metadata as Record<string, unknown>)?.detailedNote).toBe('Detailed analysis of the trade setup and execution')
		expect(foundTrade!.screenshots).toBeDefined()
		expect(foundTrade!.screenshots!.length).toBe(1)
		expect(foundTrade!.screenshots![0].url).toBe('https://example.com/test-screenshot.png')
	})

	it('should delete the trade', async () => {
		if (!createdTrade) {
			throw new Error('No trade was created in previous test')
		}

		// @ts-expect-error global $fetch is stubbed in setup.ts
		await $fetch(`/api/trades/${createdTrade.id}`, { method: 'DELETE' })

		// Verify the trade is deleted by checking it returns 404
		let tradeNotFound = false
		try {
			// @ts-expect-error global $fetch is stubbed in setup.ts
			await $fetch(`/api/trades/${createdTrade.id}`)
		} catch (err: unknown) {
			const typedErr = err as { statusCode?: number }
			if (typedErr.statusCode === 404) {
				tradeNotFound = true
			}
		}
		expect(tradeNotFound).toBe(true)
	})

	it('should cleanup test database', async () => {
		if (!testDbId) {
			throw new Error('No test database was created')
		}

		// @ts-expect-error global $fetch is stubbed in setup.ts
		await $fetch('/api/database/delete', {
			method: 'DELETE',
			body: { databaseId: testDbId, password: TEST_USER_PASSWORD }
		})

		// Verify database is removed by fetching list
		// @ts-expect-error global $fetch is stubbed in setup.ts
		const list = await $fetch('/api/database/list') as Array<{ id: number }>
		const deletedDb = list.find(db => db.id === testDbId)
		expect(deletedDb).toBeUndefined()
	})
})
