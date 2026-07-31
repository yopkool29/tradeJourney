import { eachDayOfInterval, endOfMonth } from 'date-fns'
import type { TradeExtendedType } from '~/schema/trade'
import { formatDateToYYYYMMDD } from '~/utils/date-utils'

export type TradeGroup = { key: string; count: number; day: Date; trades: TradeExtendedType[]; pnl: number; commission: number }
export type TradeGroups = { [key: string]: TradeGroup }

// Compute per-day trade groups for a given month from a flat list of trades.
// Trades are pre-indexed by day in a single O(n) pass, then each day of the
// month is materialized from the index. Inactive trades are kept in the
// `trades` array but excluded from `count` and `pnl`.
export const computeDayStats = (
	trades: TradeExtendedType[],
	month: string,
	accountIds: number[],
	refreshTrigger: number,
): TradeGroups => {
	void refreshTrigger
	if (!month) return {}

	const [year, monthNum] = month.split('-').map(Number)
	const start = new Date(year, monthNum - 1, 1)
	const end = endOfMonth(start)

	const accountIdSet = new Set(accountIds)
	const allAccounts = accountIds.length === 0 || accountIdSet.has(-1)

	const tradesByDay: Record<string, TradeExtendedType[]> = {}
	for (const trade of trades) {
		const closeDate = trade.closeDate
		if (closeDate < start || closeDate > end) continue
		if (!allAccounts && !accountIdSet.has(trade.accountId)) continue
		const key = formatDateToYYYYMMDD(closeDate)
		if (!tradesByDay[key]) tradesByDay[key] = []
		tradesByDay[key].push(trade)
	}

	const stats: TradeGroups = {}
	eachDayOfInterval({ start, end }).forEach((day) => {
		const key = formatDateToYYYYMMDD(day)
		const tradesOfDay = tradesByDay[key] || []
		const activeTradesOfDay = tradesOfDay.filter((trade) => trade.active !== false)
		const pnl = activeTradesOfDay.reduce((sum, t) => sum + (t.netProfit || 0), 0)
		const commission = activeTradesOfDay.reduce((sum, t) => sum + (t.commission || 0), 0)
		stats[key] = {
			count: activeTradesOfDay.length,
			day,
			pnl,
			commission,
			key,
			trades: tradesOfDay,
		}
	})
	return stats
}
