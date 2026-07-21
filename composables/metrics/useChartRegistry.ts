import type { ChartKey } from '~/type'

export interface ChartRegistration {
	id: ChartKey
	category: 'main' | 'time'
	defaultVisible: boolean
}

// Les breakdowns ne sont plus dans le registry — ils sont créés dynamiquement
const chartRegistry: ChartRegistration[] = [
	{ id: 'pnlBar', category: 'main', defaultVisible: true },
	{ id: 'cumulatedPnl', category: 'main', defaultVisible: true },
	{ id: 'appt', category: 'main', defaultVisible: true },
	{ id: 'winrate', category: 'main', defaultVisible: true },
	{ id: 'hourlyHeatmap', category: 'time', defaultVisible: false },
	{ id: 'hourlyWinrate', category: 'time', defaultVisible: false },
	{ id: 'dayOfWeekPnl', category: 'time', defaultVisible: false },
]

export const useMetricsChartRegistry = () => {
	const getCharts = () => chartRegistry
	const getDefaultChartVisibility = (): Record<string, boolean> => {
		return chartRegistry.reduce((acc, item) => {
			acc[item.id] = item.defaultVisible
			return acc
		}, {} as Record<string, boolean>)
	}

	return {
		getCharts,
		getDefaultChartVisibility,
	}
}
