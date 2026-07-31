import type { TimeSeriesConfig, TimeSeriesAggregation, BreakdownMetric } from '~/type'
import { metricOptions } from '~/composables/dashboard/useBreakdownConfig'

type AggregationMode = 'day' | 'week' | 'month'

export const useTimeSeriesConfig = (itemId: string) => {
	const { activeWorkspace, updateActiveWorkspace } = useDashboardWorkspace()
	const { t } = useI18n()

	const config = computed<TimeSeriesConfig>(() => {
		const configs = activeWorkspace.value?.breakdownConfigs || {}
		return (
			(configs[itemId] as TimeSeriesConfig) || {
				seriesType: 'bar',
				metric: 'pnl',
				chartType: 'timeSeries',
				maxTrades: 50,
				yAxisFormat: 'currency',
			}
		)
	})

	const updateConfig = (partial: Partial<TimeSeriesConfig>) => {
		const configs = { ...(activeWorkspace.value?.breakdownConfigs || {}) }
		configs[itemId] = { ...config.value, ...partial } as TimeSeriesConfig
		updateActiveWorkspace({ breakdownConfigs: configs } as never)
	}

	// Snapshot de la config pour Cancel/Apply dans le popover settings
	let configSnapshot: TimeSeriesConfig | null = null
	const draftAggregation = ref<AggregationMode>('week')
	const draftShowBars = ref(true)
	const draftShowMovingAverage = ref(true)

	const onSettingsOpen = () => {
		configSnapshot = { ...config.value } as TimeSeriesConfig
		draftAggregation.value = (config.value.aggregation as AggregationMode) ?? 'week'
		draftShowBars.value = config.value.showBars ?? true
		draftShowMovingAverage.value = config.value.showMovingAverage ?? true
	}
	const onSettingsCancel = () => {
		if (configSnapshot) updateConfig(configSnapshot)
		configSnapshot = null
	}
	const onSettingsApply = () => {
		updateConfig({
			aggregation: draftAggregation.value as TimeSeriesAggregation,
			showBars: draftShowBars.value,
			showMovingAverage: draftShowMovingAverage.value,
		})
		configSnapshot = null
	}

	// --- Dropdown métrique dans le header ---
	const metricItems = computed(() => {
		const isArea = config.value.seriesType === 'area'
		return metricOptions.map((m) => {
			if (isArea && m.value === 'pnl') return { value: m.value, label: t('components.dashboard.cumulated_pnl_chart.title') }
			return { value: m.value, label: t(m.labelKey) }
		})
	})

	const selectedMetric = computed<BreakdownMetric>({
		get: () => config.value.metric,
		set: (val: BreakdownMetric) => updateConfig({ metric: val }),
	})

	const aggregationOptions = computed(() => [
		{ label: t('components.dashboard.index.by_day'), value: 'day' },
		{ label: t('components.dashboard.index.by_week'), value: 'week' },
		{ label: t('components.dashboard.index.by_month'), value: 'month' },
	])

	const maxTradesOptions = [
		{ label: '20', value: 20 },
		{ label: '50', value: 50 },
		{ label: '100', value: 100 },
		{ label: '200', value: 200 },
	]

	// --- v-model wrappers ---
	const aggregation = computed<AggregationMode>({
		get: () => (config.value.aggregation as AggregationMode) ?? 'week',
		set: (val: AggregationMode) => updateConfig({ aggregation: val as TimeSeriesAggregation }),
	})

	const maxTrades = computed<number>({
		get: () => config.value.maxTrades ?? 50,
		set: (val: number) => updateConfig({ maxTrades: val }),
	})

	const showBars = computed<boolean>({
		get: () => config.value.showBars ?? true,
		set: (val: boolean) => updateConfig({ showBars: val }),
	})

	const showMovingAverage = computed<boolean>({
		get: () => config.value.showMovingAverage ?? true,
		set: (val: boolean) => updateConfig({ showMovingAverage: val }),
	})

	const showThreshold = computed<boolean>({
		get: () => config.value.showThreshold ?? true,
		set: (val: boolean) => updateConfig({ showThreshold: val }),
	})

	const crosshairType = computed<'cross' | 'line'>({
		get: () => config.value.crosshairType ?? 'cross',
		set: (val: 'cross' | 'line') => updateConfig({ crosshairType: val }),
	})

	const showScrollX = computed<boolean>({
		get: () => config.value.showScrollX ?? false,
		set: (val: boolean) => updateConfig({ showScrollX: val }),
	})

	// --- Titre ---
	const chartTitle = computed(() => {
		const st = config.value.seriesType
		if (st === 'bar') return t('components.dashboard.pnl_bar_chart.title')
		const m = config.value.metric
		const opt = metricOptions.find((o) => o.value === m)
		return opt ? t(opt.labelKey) : t('components.dashboard.appt_chart.title')
	})

	// --- Subtitle (label d'agrégation) ---
	const aggregationLabel = computed(() => {
		if (config.value.seriesType === 'bar') return undefined
		const opt = aggregationOptions.value.find((o) => o.value === aggregation.value)
		return opt?.label ?? ''
	})

	return {
		config, updateConfig,
		draftAggregation, draftShowBars, draftShowMovingAverage,
		onSettingsOpen, onSettingsCancel, onSettingsApply,
		metricItems, selectedMetric,
		aggregationOptions, maxTradesOptions,
		aggregation, maxTrades, showBars, showMovingAverage,
		showThreshold, crosshairType, showScrollX,
		chartTitle, aggregationLabel,
	}
}
