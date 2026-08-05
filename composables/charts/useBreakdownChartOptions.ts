import type { EChartsOption } from 'echarts'
import type { BreakdownConfig } from '~/type'
import type { TimezoneSettings } from '~/composables/analytics/useAnalytics'
import { calculateMetricsBy2Dimensions } from '~/composables/analytics/useAnalytics'
import { getGroupFn } from '~/composables/analytics/useBreakdownGrouping'
import { formatDimensionLabel } from '~/utils/dashboard'
import { useChartBuilder } from '~/composables/charts/useChartBuilder'

type BarOrientation = 'horizontal' | 'vertical'

export const useBreakdownChartOptions = (
	config: Ref<BreakdownConfig>,
	chartType: Ref<string>,
	filteredMetrics: Ref<ReturnType<ReturnType<typeof useMetricsCalculation>['calculateMetrics']>>,
	allTrades: Ref<ReturnType<typeof useDataStore>['lastTrades']>,
	timezoneSettings: Ref<TimezoneSettings | undefined>,
	selectedTooltipMetrics: Ref<BreakdownMetric[]>,
	logScale: Ref<boolean>,
) => {
	const { t } = useI18n()
	const { displayModeNet } = useNetGrossDisplay()
	const isDark = useIsDark()
	const { profitColor, lossColor, barColor, rawMetricColor, heatmapColors, scatter2DColors } = useTypeColors('timeSeriesChart')
	const dataStore = useDataStore()
	const dbStateStore = useDbStateStore()
	const { buildBarChartOption, buildScatterChartOption, buildScatter2DChartOption, buildScatterTradesChartOption, buildHeatmapChartOption, buildBoxplotChartOption, buildRadarChartOption } = useChartBuilder()

	const chartColors = computed(() => ({
		profit: profitColor.value,
		loss: lossColor.value,
		bar: barColor.value,
		rawMetric: rawMetricColor.value,
	}))

	const buildBarOption = (orientation: BarOrientation) => buildBarChartOption({
		metrics: filteredMetrics.value,
		dimension: config.value.dimension,
		metric: config.value.metric,
		logScale: logScale.value,
		selectedTooltipMetrics: selectedTooltipMetrics.value,
		orientation,
		colors: chartColors.value,
	})

	const barChartOption = computed<EChartsOption>(() => buildBarOption('horizontal'))
	const barVerticalChartOption = computed<EChartsOption>(() => buildBarOption('vertical'))

	const scatterChartOption = computed<EChartsOption>(() => buildScatterChartOption({
		metrics: filteredMetrics.value,
		dimension: config.value.dimension,
		metric: config.value.metric,
		selectedTooltipMetrics: selectedTooltipMetrics.value,
		colors: chartColors.value,
		isDark: isDark.value,
	}))

	const scatter2DChartOption = computed<EChartsOption>(() => {
		return buildScatter2DChartOption({
			metrics: filteredMetrics.value,
			dimension: config.value.dimension,
			metricX: config.value.metric,
			metricY: config.value.metric2 ?? 'profitFactor',
			colorMetric: config.value.colorMetric ?? 'tradesCount',
			logScale: logScale.value,
			selectedTooltipMetrics: selectedTooltipMetrics.value,
			showScrollX: config.value.showScrollX ?? true,
			showScrollY: config.value.showScrollY ?? true,
			showLabels: config.value.showLabels ?? true,
			scatter2DColors: scatter2DColors.value,
			isDark: isDark.value,
		})
	})

	const scatterTradesChartOption = computed<EChartsOption>(() => {
		const tickerFilter = config.value.tickerFilter ?? null
		const trades = tickerFilter
			? allTrades.value.filter(tr => tr.symbol === tickerFilter)
			: allTrades.value
		return buildScatterTradesChartOption({
			trades,
			propX: config.value.tradePropertyX ?? 'duration',
			propY: config.value.tradePropertyY ?? 'pnl',
			logScale: logScale.value,
			showScrollX: config.value.showScrollX ?? false,
			showScrollY: config.value.showScrollY ?? false,
			profitColor: profitColor.value,
			lossColor: lossColor.value,
			displayModeNet: displayModeNet.value,
			selectedTooltipMetrics: selectedTooltipMetrics.value,
		})
	})

	// --- Heatmap chart option (2D générique : dimension X × dimension Y) ---
	const heatmap2DCells = computed(() => {
		if (chartType.value !== 'heatmap') return []
		const trades = dataStore.lastTrades || []
		if (!trades.length) return []
		const tagGroups = dbStateStore.tagGroups || []
		const tz = timezoneSettings.value
		const dimX = config.value.dimension
		const dimY = config.value.dimension2 ?? 'dayOfWeekOpen'
		const groupFnX = getGroupFn(dimX, tagGroups, tz)
		const groupFnY = getGroupFn(dimY, tagGroups, tz)
		return calculateMetricsBy2Dimensions(trades, groupFnX, groupFnY, displayModeNet.value)
	})

	const heatmapChartOption = computed<EChartsOption>(() => {
		return buildHeatmapChartOption({
			cells: heatmap2DCells.value,
			dimensionX: config.value.dimension,
			dimensionY: config.value.dimension2 ?? 'dayOfWeekOpen',
			metric: config.value.metric,
			selectedTooltipMetrics: selectedTooltipMetrics.value,
			heatmapColors: heatmapColors.value,
			isDark: isDark.value,
		})
	})

	// --- Boxplot chart option ---
	const boxplotData = computed(() => {
		const trades = dataStore.lastTrades || []
		if (!trades.length) return { categories: [] as string[], data: [] as number[][], rawTrades: [] as number[][] }
		const tagGroups = dbStateStore.tagGroups || []
		const dim = config.value.dimension
		const groupFn = getGroupFn(dim, tagGroups, timezoneSettings.value)
		const groups = new Map<string, number[]>()
		for (const trade of trades) {
			const key = groupFn(trade)
			if (key === null || key === undefined) continue
			const val = displayModeNet.value ? trade.netProfit : trade.profit
			if (!groups.has(key)) groups.set(key, [])
			groups.get(key)!.push(val)
		}
		const sortedKeys = [...groups.keys()].sort((a, b) => {
			const sa = String(a), sb = String(b)
			if (dim === 'hourStart' || dim === 'hourEnd') return parseInt(sa) - parseInt(sb)
			if (dim === 'dayOfWeekOpen' || dim === 'dayOfWeekClose') return parseInt(sa) - parseInt(sb)
			if (dim === 'monthOpen' || dim === 'monthClose') return parseInt(sa) - parseInt(sb)
			return sa.localeCompare(sb)
		})
		const topN = config.value.filter?.topN
		const limitedKeys = (!topN || topN <= 0) ? sortedKeys : sortedKeys.slice(0, topN)
		const categories = limitedKeys.map(k => formatDimensionLabel(dim, String(k), t))
		const data = limitedKeys.map(k => {
			const vals = groups.get(k) || []
			if (!vals.length) return [0, 0, 0, 0, 0]
			const sorted = [...vals].sort((a, b) => a - b)
			const q = (p: number) => {
				const idx = p * (sorted.length - 1)
				const lo = Math.floor(idx)
				const hi = Math.ceil(idx)
				if (lo === hi) return sorted[lo]
				return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
			}
			return [sorted[0], q(0.25), q(0.5), q(0.75), sorted[sorted.length - 1]]
		})
		const rawTrades = limitedKeys.map(k => groups.get(k) || [])
		return { categories, data, rawTrades }
	})

	const boxplotChartOption = computed<EChartsOption>(() => {
		const { categories, data, rawTrades } = boxplotData.value
		return buildBoxplotChartOption({
			categories,
			data,
			rawTrades,
			barColor: barColor.value,
			isDark: isDark.value,
		})
	})

	// --- Radar chart option ---
	const radarMetrics = computed(() => {
		const metrics = filteredMetrics.value
		if (!metrics.length) return { indicators: [] as { name: string, max: number }[], values: [] as number[][], names: [] as string[] }
		const dim = config.value.dimension
		const maxPF = Math.max(...metrics.map(m => m.profitFactor || 0), 1)
		const maxExp = Math.max(...metrics.map(m => Math.abs(m.appt || 0)), 1)
		const maxPnl = Math.max(...metrics.map(m => Math.abs(m.pnl || 0)), 1)
		const maxCount = Math.max(...metrics.map(m => m.tradesCount || 0), 1)
		const limited = metrics.slice(0, 8)
		const names = limited.map(m => formatDimensionLabel(dim, m.key, t))
		const indicators = [
			{ name: t('components.dashboard.breakdown.metrics.winrate'), max: 100 },
			{ name: t('components.dashboard.breakdown.metrics.profitFactor'), max: maxPF },
			{ name: t('components.dashboard.breakdown.metrics.expectancy'), max: maxExp },
			{ name: t('components.dashboard.breakdown.metrics.pnl'), max: maxPnl },
			{ name: t('components.dashboard.breakdown.metrics.tradesCount'), max: maxCount },
		]
		const values = limited.map(m => [
			m.winrate || 0,
			m.profitFactor || 0,
			m.appt || 0,
			m.pnl || 0,
			m.tradesCount || 0,
		])
		return { indicators, values, names }
	})

	const radarChartOption = computed<EChartsOption>(() => {
		const { indicators, values, names } = radarMetrics.value
		return buildRadarChartOption({
			indicators,
			values,
			names,
			isDark: isDark.value,
		})
	})

	// Chart option finale selon le type
	const chartOption = computed<EChartsOption | undefined>(() => {
		if (chartType.value === 'bar') return barChartOption.value
		if (chartType.value === 'barVertical') return barVerticalChartOption.value
		if (chartType.value === 'scatter') return scatterChartOption.value
		if (chartType.value === 'scatter2D') return scatter2DChartOption.value
		if (chartType.value === 'scatterTrades') return scatterTradesChartOption.value
		if (chartType.value === 'heatmap') return heatmapChartOption.value
		if (chartType.value === 'boxplot') return boxplotChartOption.value
		if (chartType.value === 'radar') return radarChartOption.value
		return undefined
	})

	return { chartOption }
}
