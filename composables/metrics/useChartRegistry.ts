import type { ChartKey } from '~/type'

export interface ChartRegistration {
	id: ChartKey
	category: 'main' | 'ticker'
	defaultVisible: boolean
}

const chartRegistry: ChartRegistration[] = [
	{ id: 'pnlBar', category: 'main', defaultVisible: true },
	{ id: 'cumulatedPnl', category: 'main', defaultVisible: true },
	{ id: 'appt', category: 'main', defaultVisible: true },
	{ id: 'winrate', category: 'main', defaultVisible: true },
	{ id: 'tickerPnl', category: 'ticker', defaultVisible: false },
	{ id: 'tickerWinrate', category: 'ticker', defaultVisible: false },
	{ id: 'hourlyHeatmap', category: 'ticker', defaultVisible: false },
	{ id: 'hourlyWinrate', category: 'ticker', defaultVisible: false },
	{ id: 'dayOfWeekPnl', category: 'ticker', defaultVisible: false },
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
