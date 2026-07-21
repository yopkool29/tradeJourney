import type { ChartKey } from '~/type'

export interface ChartRegistration {
	id: ChartKey
	category: 'main' | 'ticker' | 'breakdown' | 'time'
	defaultVisible: boolean
}

const chartRegistry: ChartRegistration[] = [
	{ id: 'pnlBar', category: 'main', defaultVisible: true },
	{ id: 'cumulatedPnl', category: 'main', defaultVisible: true },
	{ id: 'appt', category: 'main', defaultVisible: true },
	{ id: 'winrate', category: 'main', defaultVisible: true },
	{ id: 'tickerPnl', category: 'breakdown', defaultVisible: false },
	{ id: 'tickerWinrate', category: 'breakdown', defaultVisible: false },
	{ id: 'tagPnl', category: 'breakdown', defaultVisible: false },
	{ id: 'tagWinrate', category: 'breakdown', defaultVisible: false },
	{ id: 'sidePnl', category: 'breakdown', defaultVisible: false },
	{ id: 'sideWinrate', category: 'breakdown', defaultVisible: false },
	{ id: 'hourlyHeatmap', category: 'time', defaultVisible: false },
	{ id: 'hourlyWinrate', category: 'time', defaultVisible: false },
	{ id: 'dayOfWeekPnl', category: 'time', defaultVisible: false },
]

export const useMetricsChartRegistry = () => {
	const getCharts = () => chartRegistry
	const getDefaultChartVisibility = (): Record<ChartKey, boolean> => {
		return chartRegistry.reduce((acc, item) => {
			acc[item.id] = item.defaultVisible
			return acc
		}, {} as Record<ChartKey, boolean>)
	}

	return {
		getCharts,
		getDefaultChartVisibility,
	}
}
