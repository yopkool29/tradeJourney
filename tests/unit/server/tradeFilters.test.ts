import { describe, expect, it } from 'vitest'
import { buildTradeWhere } from '~/server/services/tradeFilters'
import type { TradeFilter } from '~/type'

const build = (filters: TradeFilter[], showInactive = false) => buildTradeWhere(filters, showInactive)

describe('buildTradeWhere', () => {
	it('preserves active filtering and ignores the all-accounts sentinel', () => {
		expect(build([{ column: 'accountId', operator: '=', value: -1 }])).toEqual({ AND: [], active: true })
		expect(build([], true)).toEqual({})
	})

	it('converts numeric, array and tag filters to Prisma conditions', () => {
		expect(build([
			{ column: 'accountId', operator: '=', value: '4' },
			{ column: 'lot', operator: 'in', value: ['1', '2'] },
			{ column: 'tags', operator: '=', value: '3, invalid, 7' },
		], true)).toEqual({
			AND: [
				{ accountId: { equals: 4 } },
				{ lot: { in: [1, 2] } },
				{ tags: { some: { tagId: { in: [3, 7] } } } },
			],
		})
	})

	it('expands date equality to the complete local day and drops invalid dates', () => {
		const where = build([
			{ column: 'openDate', operator: '=', value: '2024-05-10T12:30:00Z' },
			{ column: 'closeDate', operator: '>', value: 'not-a-date' },
		], true)
		const condition = (where.AND as object[])[0] as { openDate: { gte: Date, lt: Date } }
		expect(condition.openDate.gte.getHours()).toBe(0)
		expect(condition.openDate.lt.getTime() - condition.openDate.gte.getTime()).toBe(24 * 60 * 60 * 1000)
		expect(where.AND).toHaveLength(1)
	})
})
