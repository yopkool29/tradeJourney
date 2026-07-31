import type { SectionKey, BreakdownConfig, TimeSeriesConfig, WorkspaceConfig, DashBoardResult } from '~/type'
import { defaultDashboardGridLayout, defaultDashboardGridLayoutMd, defaultDashboardGridLayoutSm } from '~/utils/dashboard'

// Les breakdowns ne sont plus dans les defaults — ils sont créés dynamiquement
// par l'utilisateur via le menu visibilité (clés uniques par instance)
export const defaultChartVisibility: Record<string, boolean> = { 'timeSeries_defaultPnlByTrade': true, 'timeSeries_defaultCumulatedPnl': true, 'timeSeries_defaultAppt': true, 'timeSeries_defaultWinrate': true, 'breakdownHeatmap_defaultHourDay': false, 'breakdownBarVertical_defaultWinrateByHour': false, 'breakdownBarVertical_defaultPnlByDayOfWeek': false }
export const defaultSectionVisibility: Record<SectionKey, boolean> = { allTrades: true, profitTrades: true, losingTrades: true, winLossComparison: true, riskRatios: true, dayStatistics: false }
export const hiddenChartVisibility: Record<string, boolean> = { pnlBar: false, cumulatedPnl: false, appt: false, winrate: false, hourlyHeatmap: false, 'timeSeries_defaultPnlByTrade': false, 'timeSeries_defaultCumulatedPnl': false, 'timeSeries_defaultAppt': false, 'timeSeries_defaultWinrate': false, 'breakdownHeatmap_defaultHourDay': false, 'breakdownBarVertical_defaultWinrateByHour': false, 'breakdownBarVertical_defaultPnlByDayOfWeek': false }
export const hiddenSectionVisibility: Record<SectionKey, boolean> = { allTrades: false, profitTrades: false, losingTrades: false, winLossComparison: false, riskRatios: false, dayStatistics: false }

// Configs par défaut pour les instances de breakdown prédéfinies (clés fixes)
export const defaultBreakdownConfigs: Record<string, BreakdownConfig> = {
	'breakdownBarVertical_defaultWinrateByHour': { dimension: 'hourStart', metric: 'winrate', chartType: 'barVertical' },
	'breakdownBarVertical_defaultPnlByDayOfWeek': { dimension: 'dayOfWeekOpen', metric: 'pnl', chartType: 'barVertical' },
	'breakdownHeatmap_defaultHourDay': { dimension: 'hourStart', dimension2: 'dayOfWeekOpen', metric: 'pnl', chartType: 'heatmap' },
}

// Configs par défaut pour les instances de séries temporelles prédéfinies (clés fixes)
export const defaultTimeSeriesConfigs: Record<string, TimeSeriesConfig> = {
	'timeSeries_defaultPnlByTrade': { seriesType: 'bar', metric: 'pnl', chartType: 'timeSeries', maxTrades: 50, yAxisFormat: 'currency', crosshairType: 'cross' },
	'timeSeries_defaultCumulatedPnl': { seriesType: 'area', metric: 'pnl', chartType: 'timeSeries', aggregation: 'week', showThreshold: true, yAxisFormat: 'currency', crosshairType: 'line' },
	'timeSeries_defaultAppt': { seriesType: 'barMA', metric: 'appt', chartType: 'timeSeries', aggregation: 'week', showBars: true, showMovingAverage: true, movingAverageWindow: 5, yAxisFormat: 'currency', crosshairType: 'cross' },
	'timeSeries_defaultWinrate': { seriesType: 'barMA', metric: 'winrate', chartType: 'timeSeries', aggregation: 'week', showBars: true, showMovingAverage: true, movingAverageWindow: 3, yAxisMin: 0, yAxisMax: 100, yAxisFormat: 'percent', crosshairType: 'cross' },
}

export const buildDefaultWorkspace = (id: string, name: string, partial?: Partial<WorkspaceConfig>): WorkspaceConfig => ({
	id,
	name,
	dashboardChartVisibilityLg: { ...defaultChartVisibility },
	dashboardChartVisibilityMd: { ...defaultChartVisibility },
	dashboardChartVisibilitySm: { ...defaultChartVisibility },
	dashboardSectionVisibilityLg: { ...defaultSectionVisibility },
	dashboardSectionVisibilityMd: { ...defaultSectionVisibility },
	dashboardSectionVisibilitySm: { ...defaultSectionVisibility },
	dashboardGridLayout: defaultDashboardGridLayout.map(item => ({ ...item })),
	dashboardGridLayoutMd: defaultDashboardGridLayoutMd.map(item => ({ ...item })),
	dashboardGridLayoutSm: defaultDashboardGridLayoutSm.map(item => ({ ...item })),
	breakdownConfigs: { ...defaultBreakdownConfigs, ...defaultTimeSeriesConfigs },
	...partial,
})

// Valeurs par défaut pour le reset du workspace summary
export const getDefaultSummaryState = () => ({
	dashboardChartVisibilityLg: { ...defaultChartVisibility },
	dashboardChartVisibilityMd: { ...defaultChartVisibility },
	dashboardChartVisibilitySm: { ...defaultChartVisibility },
	dashboardSectionVisibilityLg: { ...defaultSectionVisibility },
	dashboardSectionVisibilityMd: { ...defaultSectionVisibility },
	dashboardSectionVisibilitySm: { ...defaultSectionVisibility },
	dashboardGridLayout: defaultDashboardGridLayout.map(item => ({ ...item })),
	dashboardGridLayoutMd: defaultDashboardGridLayoutMd.map(item => ({ ...item })),
	dashboardGridLayoutSm: defaultDashboardGridLayoutSm.map(item => ({ ...item })),
	breakdownConfigs: { ...defaultBreakdownConfigs, ...defaultTimeSeriesConfigs },
})

export const defaultDashBoardResult: DashBoardResult = {
	pnl: 0, appt: 0, plRatio: 0, winrate: 0, profitFactor: 0,
	recoveryFactor: 0, sharpeRatio: 0, sortinoRatio: 0, calmarRatio: 0, sqn: 0, ulcerIndex: 0,
	tradesCount: 0, grossPnl: 0, totalContracts: 0, avgTradeDuration: 0, maxTradeDuration: 0,
	expectancy: 0, totalCommission: 0, totalProfit: 0, winningTradesCount: 0, winningContractsCount: 0,
	largestWin: 0, avgWin: 0, stdDevWin: 0, avgWinDuration: 0, maxWinDuration: 0,
	winningTradesCommission: 0, maxRunUp: 0, maxRunUpDateFrom: null, maxRunUpDateTo: null,
	maxWinningStreak: 0, totalLoss: 0, losingTradesCount: 0, losingContractsCount: 0,
	largestLoss: 0, avgLoss: 0, stdDevLoss: 0, avgLossDuration: 0, maxLossDuration: 0,
	losingTradesCommission: 0, maxDrawdown: 0, maxDrawdownDateFrom: null, maxDrawdownDateTo: null,
	maxLosingStreak: 0, breakevenTradesCount: 0, breakevenContractsCount: 0,
	totalTradingDays: 0, tradeFrequency: 0, winningDays: 0, losingDays: 0, breakevenDays: 0,
	maxConsecutiveWinningDays: 0, maxConsecutiveLosingDays: 0,
	winningWeeksPercent: 0, winningMonthsPercent: 0, averageDailyPnl: 0,
	averageWinningDayPnl: 0, averageLosingDayPnl: 0, largestProfitableDayPnl: 0,
	largestProfitableDayDate: null, largestLosingDayPnl: 0, largestLosingDayDate: null,
	dailyMaxDrawdown: 0, dailyMaxDrawdownPercent: 0, averageDrawdown: 0, averageDrawdownPercent: 0,
	totalR: null, apptR: null, profitFactorR: null, plRatioR: null,
	avgWinR: null, avgLossR: null, largestWinR: null, largestLossR: null,
	totalProfitR: null, totalLossR: null, tradesWithRMultiple: 0,
	tradesWithStopLoss: 0, rMultipleCoverage: 0, rMultipleReliability: 'none',
}

export const defaultColumnVisibility: Record<string, boolean> = {
	openDate: true, closeDate: true, symbol: true, type: true, lot: true,
	openPrice: true, closePrice: true, profit: true, grossProfit: false,
	commission: false, stopLoss: false, takeProfit: false, riskReward: true,
	instrumentType: false,
}

export const defaultDailyColumnVisibility: Record<string, boolean> = {
	lot: true, openDate: true, closeDate: true, symbol: true, type: true,
	openPrice: true, closePrice: true, profit: true, grossProfit: false,
	commission: false, stopLoss: false, takeProfit: false, riskReward: true,
}
