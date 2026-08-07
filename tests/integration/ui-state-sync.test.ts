import { describe, it, expect, beforeAll } from 'vitest'
import { gzipSync } from 'node:zlib'
import { loginTestUser, checkServerRunning, getSessionHeaders } from './utils/test-helpers'

describe('UI State Sync Integration', () => {
	beforeAll(async () => {
		await checkServerRunning()
		await loginTestUser()
	}, 30000)

	it('should save UI state with gzip compression', async () => {
		const uiState = {
			customInputsPerDb: {
				test_db: [
					{ id: 1, key: 'field1', value: 'value1' },
					{ id: 2, key: 'field2', value: 'value2' },
				],
			},
			dashBoardFiltersPerDb: {
				test_db: {
					accountIds: [1, 2, 3],
					period: 'last_three_months_until_now',
					workspaces: [
						{
							id: 'ws1',
							name: 'Workspace 1',
							dashboardGridLayout: [
								{ x: 0, y: 0, w: 6, h: 4, i: 'item1' },
								{ x: 6, y: 0, w: 6, h: 4, i: 'item2' },
							],
						},
					],
				},
			},
			chartSettingsPerDb: {
				test_db: { timeframe: '1m', showAdjacent: true },
			},
		}

		const json = JSON.stringify(uiState)
		const compressed = gzipSync(Buffer.from(json))
		const base64 = compressed.toString('base64')

		const result = await $fetch('/api/auth/save-ui-state', {
			method: 'POST',
			headers: { ...getSessionHeaders(), 'Content-Type': 'application/json' },
			body: { compressed: base64 },
		}) as { success: boolean }

		expect(result.success).toBe(true)
	})

	it('should save UI state without compression (plain JSON)', async () => {
		const uiState = {
			recentColorsPerDb: {
				test_db: ['#ff0000', '#00ff00', '#0000ff'],
			},
		}

		const result = await $fetch('/api/auth/save-ui-state', {
			method: 'POST',
			headers: { ...getSessionHeaders(), 'Content-Type': 'application/json' },
			body: uiState,
		}) as { success: boolean }

		expect(result.success).toBe(true)
	})

	it('should retrieve saved UI state from auth endpoint', async () => {
		const testData = {
			tradeOptionsPerDb: {
				test_db: { showInactive: false, accountIds: [10, 20] },
			},
		}

		const json = JSON.stringify(testData)
		const compressed = gzipSync(Buffer.from(json))
		const base64 = compressed.toString('base64')

		await $fetch('/api/auth/save-ui-state', {
			method: 'POST',
			headers: { ...getSessionHeaders(), 'Content-Type': 'application/json' },
			body: { compressed: base64 },
		})

		const authData = await $fetch('/api/auth', {
			headers: getSessionHeaders(),
		}) as { metadata?: { pnltracker?: { uiState?: Record<string, unknown> } } }

		expect(authData.metadata).toBeDefined()
		expect(authData.metadata!.pnltracker).toBeDefined()
		expect(authData.metadata!.pnltracker!.uiState).toBeDefined()
		expect(authData.metadata!.pnltracker!.uiState!.tradeOptionsPerDb).toBeDefined()
		const tradeOptions = authData.metadata!.pnltracker!.uiState!.tradeOptionsPerDb as Record<string, { accountIds: number[] }>
		expect(tradeOptions.test_db).toBeDefined()
		expect(tradeOptions.test_db.accountIds).toEqual([10, 20])
	})

	it('should reject invalid compressed data', async () => {
		try {
			await $fetch('/api/auth/save-ui-state', {
				method: 'POST',
				headers: { ...getSessionHeaders(), 'Content-Type': 'application/json' },
				body: { compressed: 'invalid-base64-data!!!' },
			})
			expect.unreachable('Should have thrown')
		} catch (err) {
			expect((err as { statusCode?: number }).statusCode).toBe(500)
		}
	})

	it('should handle large UI state with gzip compression', async () => {
		const largeUiState: Record<string, unknown> = {}
		for (let i = 0; i < 50; i++) {
			largeUiState[`key_${i}`] = {
				data: Array.from({ length: 100 }, (_, j) => ({
					id: j,
					value: `item_${i}_${j}`,
					nested: { a: i, b: j, c: `deep_${i}_${j}` },
				})),
			}
		}

		const json = JSON.stringify(largeUiState)
		const uncompressedSize = Buffer.byteLength(json)
		const compressed = gzipSync(Buffer.from(json))
		const compressedSize = compressed.length
		const base64 = compressed.toString('base64')

		expect(compressedSize).toBeLessThan(uncompressedSize)

		const result = await $fetch('/api/auth/save-ui-state', {
			method: 'POST',
			headers: { ...getSessionHeaders(), 'Content-Type': 'application/json' },
			body: { compressed: base64 },
		}) as { success: boolean }

		expect(result.success).toBe(true)
	})
})
