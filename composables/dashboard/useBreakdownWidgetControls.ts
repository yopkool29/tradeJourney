import type { ComputedRef } from 'vue'
import type { BreakdownConfig, BreakdownDimension, BreakdownMetric, TradeProperty } from '~/type'
import type { TradeExtendedType } from '~/schema/trade'
import { defaultTableColumns, dimensionOptions, metricOptions } from '~/composables/dashboard/useBreakdownConfig'

type ConfigUpdater = (patch: Partial<BreakdownConfig>) => void

type BreakdownWidgetControlsOptions = {
	config: ComputedRef<BreakdownConfig>
	setDimension: (dimension: BreakdownDimension) => void
	setMetric: (metric: BreakdownMetric) => void
	updateConfig: ConfigUpdater
	allTrades: ComputedRef<TradeExtendedType[]>
}

export const useBreakdownWidgetControls = ({
	config,
	setDimension,
	setMetric,
	updateConfig,
	allTrades,
}: BreakdownWidgetControlsOptions) => {
	const { t } = useI18n()
	const dbStateStore = useDbStateStore()

	const buildDimensionItems = () => {
		const fixed = dimensionOptions.map(dimension => ({ value: dimension.value, label: t(dimension.labelKey) }))
		const tagGroups = (dbStateStore.tagGroups || []).map(group => ({
			value: `tagGroup_${group.name}`,
			label: `${t('components.dashboard.breakdown.dimensions.tag')}: ${group.name}`,
		}))
		return [...fixed, ...tagGroups]
	}

	const dimensionItems = computed(buildDimensionItems)
	const heatmapDimensionItems = computed(buildDimensionItems)
	const metricItems = computed(() => metricOptions.map(metric => ({ value: metric.value, label: t(metric.labelKey) })))
	const topNOptions = computed(() => [
		{ value: 0, label: t('components.dashboard.breakdown.all') },
		...([50, 40, 30, 20, 15, 10].map(value => ({ value, label: String(value) }))),
	])

	const selectedDimension = computed({
		get: () => config.value.dimension,
		set: (value: BreakdownDimension) => setDimension(value),
	})
	const selectedDimension2 = computed<BreakdownDimension>({
		get: () => config.value.dimension2 ?? 'dayOfWeekOpen',
		set: (value: BreakdownDimension) => updateConfig({ dimension2: value }),
	})
	const selectedMetric = computed({
		get: () => config.value.metric,
		set: (value: BreakdownMetric) => setMetric(value),
	})
	const selectedMetric2 = computed({
		get: () => config.value.metric2 ?? 'profitFactor',
		set: (value: BreakdownMetric) => updateConfig({ metric2: value }),
	})
	const selectedColorMetric = computed({
		get: () => config.value.colorMetric ?? 'tradesCount',
		set: (value: BreakdownMetric) => updateConfig({ colorMetric: value }),
	})
	const showScrollX = computed({
		get: () => config.value.showScrollX ?? true,
		set: (value: boolean) => updateConfig({ showScrollX: value }),
	})
	const showScrollY = computed({
		get: () => config.value.showScrollY ?? true,
		set: (value: boolean) => updateConfig({ showScrollY: value }),
	})
	const showLabels = computed({
		get: () => config.value.showLabels ?? true,
		set: (value: boolean) => updateConfig({ showLabels: value }),
	})
	const logScale = computed({
		get: () => config.value.logScale ?? false,
		set: (value: boolean) => updateConfig({ logScale: value }),
	})
	const selectedTradePropertyX = computed({
		get: () => config.value.tradePropertyX ?? 'duration',
		set: (value: TradeProperty) => updateConfig({ tradePropertyX: value }),
	})
	const selectedTradePropertyY = computed({
		get: () => config.value.tradePropertyY ?? 'pnl',
		set: (value: TradeProperty) => updateConfig({ tradePropertyY: value }),
	})
	const selectedTickerFilter = computed({
		get: () => config.value.tickerFilter ?? null,
		set: (value: string | null) => updateConfig({ tickerFilter: value }),
	})
	const tradePropertyItems = [
		{ label: t('components.dashboard.breakdown.trade_property.duration'), value: 'duration' },
		{ label: t('components.dashboard.breakdown.trade_property.pnl'), value: 'pnl' },
		{ label: t('components.dashboard.breakdown.trade_property.mfe'), value: 'mfe' },
		{ label: t('components.dashboard.breakdown.trade_property.mae'), value: 'mae' },
	]
	const tickerFilterItems = computed(() => {
		const tickers = new Set<string>()
		for (const trade of allTrades.value) {
			if (trade.symbol) tickers.add(trade.symbol)
		}
		return [
			{ label: t('components.dashboard.breakdown.all_tickers'), value: null },
			...[...tickers].sort().map(ticker => ({ label: ticker, value: ticker })),
		]
	})
	const selectedTopN = computed({
		get: () => config.value.filter?.topN ?? 0,
		set: (value: number) => updateConfig({ filter: { ...(config.value.filter || {}), topN: value || undefined } }),
	})
	const selectedColumns = computed<BreakdownMetric[]>({
		get: () => config.value.columns ?? defaultTableColumns,
		set: (value: BreakdownMetric[]) => updateConfig({ columns: value }),
	})

	return {
		dimensionItems,
		heatmapDimensionItems,
		metricItems,
		topNOptions,
		selectedDimension,
		selectedDimension2,
		selectedMetric,
		selectedMetric2,
		selectedColorMetric,
		showScrollX,
		showScrollY,
		showLabels,
		logScale,
		selectedTradePropertyX,
		selectedTradePropertyY,
		selectedTickerFilter,
		tradePropertyItems,
		tickerFilterItems,
		selectedTopN,
		selectedColumns,
	}
}
