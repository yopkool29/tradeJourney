import { describe, expect, it } from 'vitest'
import { ListDailyNotesInputSchema, SearchTradesInputSchema, TradeFiltersSchema } from '~/mcp/schemas'

describe('MCP input schemas', () => {
	it('applies bounded search defaults', () => {
		expect(SearchTradesInputSchema.parse({ database_id: 2 })).toEqual({
			database_id: 2,
			filters: { date_field: 'closeDate' },
			pnl_mode: 'net',
			page: 1,
			page_size: 50,
		})
	})

	it('applies bounded daily note defaults', () => {
		expect(ListDailyNotesInputSchema.parse({ database_id: 2 })).toEqual({ database_id: 2, page: 1, page_size: 20 })
		expect(() => ListDailyNotesInputSchema.parse({ database_id: 2, page_size: 51 })).toThrow()
	})

	it.each([
		{ database_id: 0 },
		{ database_id: 1, page_size: 201 },
		{ database_id: 1, page: 0 },
	])('rejects invalid bounded search input: %j', input => {
		expect(() => SearchTradesInputSchema.parse(input)).toThrow()
	})

	it('rejects reversed date and P&L ranges', () => {
		expect(() => TradeFiltersSchema.parse({
			date_from: '2026-08-02T00:00:00Z',
			date_to: '2026-08-01T00:00:00Z',
		})).toThrow('date_from must be before or equal to date_to')
		expect(() => TradeFiltersSchema.parse({ pnl_min: 10, pnl_max: -10 })).toThrow('pnl_min must be lower than or equal to pnl_max')
	})

	it('rejects unknown filter fields', () => {
		expect(() => TradeFiltersSchema.parse({ sql: 'select * from users' })).toThrow()
	})
})
