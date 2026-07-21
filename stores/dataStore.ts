import { defineStore } from 'pinia'
import type { TradeExtendedType } from '~/schema/trade'
import type { DashBoardResult } from '~/type'
import type { DayTagType } from '~/schema/dayTag'
import type { SymbolType } from '~/schema/symbol'
import type { TagGroupType } from '~/schema/tagGroup'

export const useDataStore = defineStore(
	'dataStore',
	() => {
		// Dashboard data (non-persisted)
		// shallowRef avoids deep-reactivity overhead on large trade arrays
		const lastTrades = shallowRef<TradeExtendedType[]>([])

		const dashboardResult = ref<DashBoardResult>({
			pnl: 0, appt: 0, plRatio: 0, winrate: 0, profitFactor: 0, recoveryFactor: 0, sharpeRatio: 0,
			tradesCount: 0, grossPnl: 0, totalContracts: 0, avgTradeDuration: 0, maxTradeDuration: 0,
			expectancy: 0, totalCommission: 0, totalProfit: 0, winningTradesCount: 0, winningContractsCount: 0,
			largestWin: 0, avgWin: 0, stdDevWin: 0, avgWinDuration: 0, maxWinDuration: 0, winningTradesCommission: 0,
			maxRunUp: 0, maxRunUpDateFrom: null, maxRunUpDateTo: null, maxWinningStreak: 0,
			totalLoss: 0, losingTradesCount: 0, losingContractsCount: 0, largestLoss: 0, avgLoss: 0,
			stdDevLoss: 0, avgLossDuration: 0, maxLossDuration: 0, losingTradesCommission: 0,
			maxDrawdown: 0, maxDrawdownDateFrom: null, maxDrawdownDateTo: null, maxLosingStreak: 0,
			breakevenTradesCount: 0, breakevenContractsCount: 0,

			// Daily metrics
			totalTradingDays: 0, winningDays: 0, losingDays: 0, breakevenDays: 0,
			maxConsecutiveWinningDays: 0, maxConsecutiveLosingDays: 0,
			averageDailyPnl: 0, averageWinningDayPnl: 0, averageLosingDayPnl: 0,
			largestProfitableDayPnl: 0, largestProfitableDayDate: null,
			largestLosingDayPnl: 0, largestLosingDayDate: null,
			dailyMaxDrawdown: 0, dailyMaxDrawdownPercent: 0,
			averageDrawdown: 0, averageDrawdownPercent: 0,

			// R-multiple metrics
			totalR: null, apptR: null, profitFactorR: null, plRatioR: null,
			avgWinR: null, avgLossR: null, largestWinR: null, largestLossR: null,
			totalProfitR: null, totalLossR: null, tradesWithRMultiple: 0,
			tradesWithStopLoss: 0, rMultipleCoverage: 0, rMultipleReliability: 'none'
		})

		// Daily history data (non-persisted) - current DB only
		const dailyLastTrades = shallowRef<TradeExtendedType[]>([])
		const calendarLastTrades = shallowRef<TradeExtendedType[]>([])

		// Day tags (non-persisted) - keyed by dbName
		const dayTagsPerDb = ref<Record<string, DayTagType[]>>({})

		// Dashboard result per DB (non-persisted) - kept as Record for multi-db support
		const dashBoardResultPerDb = ref<Record<string, DashBoardResult>>({})

		// Symbols (non-persisted) - can be reloaded from API
		const symbolsPerDb = ref<Record<string, SymbolType[]>>({})

		// Tag groups (non-persisted) - keyed by dbName
		const tagGroupsPerDb = ref<Record<string, TagGroupType[]>>({})

		return {
			lastTrades,
			dashboardResult,
			dailyLastTrades,
			calendarLastTrades,
			dayTagsPerDb,
			dashBoardResultPerDb,
			symbolsPerDb,
			tagGroupsPerDb
		}
	},
	{
		persist: false // Non persistant - memoire uniquement
	}
)
