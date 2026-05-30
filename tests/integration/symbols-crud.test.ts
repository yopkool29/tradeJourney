import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { CreateSymbolType, SymbolType, UpdateSymbolType } from '~/schema/symbol'
import { acquireTestDatabase, releaseTestDatabase } from './utils/test-database'

describe('Database Integration - Symbols CRUD', () => {
	let testDbId: number
	let createdSymbol: SymbolType | null = null

	beforeAll(async () => {
		const db = await acquireTestDatabase()
		testDbId = db.id
	}, 30000)

	afterAll(async () => {
		await releaseTestDatabase(testDbId)
	})

	it('should fetch symbols (empty or defaults)', async () => {
		const { fetchSymbols, symbols } = useSymbols()
		await fetchSymbols()
		expect(Array.isArray(symbols.value)).toBe(true)
	})

	it('should create a symbol', async () => {
		const { createSymbol } = useSymbols()
		const newSymbol: CreateSymbolType = {
			symbol: `test_sym_${Date.now()}`,
			digit: 2,
			active: true,
			notes: 'Test symbol notes',
			aliases: 'alias1, alias2',
			pricePerPoint: 1.0
		}
		createdSymbol = await createSymbol(newSymbol)
		expect(createdSymbol).toBeDefined()
		expect(createdSymbol.id).toBeDefined()
		expect(createdSymbol.symbol).toBe(newSymbol.symbol.toUpperCase())
		expect(createdSymbol.digit).toBe(2)
		expect(createdSymbol.pricePerPoint).toBe(1.0)
		expect(createdSymbol.active).toBe(true)
	})

	it('should fetch symbols and find the created one', async () => {
		const { fetchSymbols, symbols } = useSymbols()
		await fetchSymbols()
		const found = symbols.value.find(s => s.id === createdSymbol?.id)
		expect(found).toBeDefined()
		expect(found?.symbol).toBe(createdSymbol?.symbol)
	})

	it('should get digit from symbol (cache)', () => {
		const { getDigitFromSymbol, getPricePointFromSymbol } = useSymbols()
		if (!createdSymbol) {
			throw new Error('No symbol was created')
		}
		const digit = getDigitFromSymbol(createdSymbol.symbol)
		expect(digit).toBe(2)

		const pricePoint = getPricePointFromSymbol(createdSymbol.symbol)
		expect(pricePoint).toBe(1.0)
	})

	it('should get digit from unknown symbol (fallback)', () => {
		const { getDigitFromSymbol, getPricePointFromSymbol } = useSymbols()
		const digit = getDigitFromSymbol('UNKNOWN_SYMBOL')
		expect(digit).toBe(2)

		const pricePoint = getPricePointFromSymbol('UNKNOWN_SYMBOL')
		expect(pricePoint).toBe(-1)
	})

	it('should update a symbol', async () => {
		const { updateSymbol } = useSymbols()
		if (!createdSymbol) {
			throw new Error('No symbol was created')
		}
		const updateData: UpdateSymbolType = {
			id: createdSymbol.id,
			digit: 4,
			notes: 'Updated notes'
		}
		const updated = await updateSymbol(updateData)
		expect(updated).toBeDefined()
		expect(updated.id).toBe(createdSymbol.id)
		expect(updated.digit).toBe(4)
		expect(updated.notes).toBe('Updated notes')
		createdSymbol = updated
	})

	it('should delete a symbol', async () => {
		const { deleteSymbol, fetchSymbols } = useSymbols()
		if (!createdSymbol) {
			throw new Error('No symbol was created')
		}
		await deleteSymbol(createdSymbol.id)
		const symbols = await fetchSymbols()
		const found = symbols.find(s => s.id === createdSymbol?.id)
		expect(found).toBeUndefined()
	})
})
