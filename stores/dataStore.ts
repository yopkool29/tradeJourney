import { defineStore } from 'pinia'
import type { TradeExtendedType } from '~/schema/trade'
import type { DashBoardResult } from '~/type'
import type { DayTagType } from '~/schema/dayTag'
import type { SymbolType } from '~/schema/symbol'
import type { TagGroupType } from '~/schema/tagGroup'
import { defaultDashBoardResult } from '~/stores/dbStateDefaults'

export const useDataStore = defineStore(
	'dataStore',
	() => {
		// Dashboard data (non-persisted)
		// shallowRef avoids deep-reactivity overhead on large trade arrays
		const lastTrades = shallowRef<TradeExtendedType[]>([])

		const dashboardResult = ref<DashBoardResult>({ ...defaultDashBoardResult })

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
