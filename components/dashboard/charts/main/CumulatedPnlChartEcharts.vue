<template>
	<DashboardChartsBaseCumulatedLineChart
		:title="$t('components.dashboard.cumulated_pnl_chart.title')"
		:enlarged-title="$t('components.dashboard.cumulated_pnl_chart.enlarged_title')"
		:labels="labels"
		:values="values"
		:threshold="threshold"
		:profit-color="profitColor"
		:loss-color="lossColor"
		:tooltip-formatter="tooltipFormatter"
		:y-axis-formatter="formatCurrency"
		:canvas-height="canvasHeight"
		:loading="loading"
		:subtitle="aggregationLabel"
	>
		<template #settings>
			<div class="space-y-2">
				<div class="flex flex-col gap-1">
					<span class="text-sm font-medium">{{ $t('components.dashboard.common.aggregation') }}</span>
					<USelect
						v-model="cumuleMode"
						:items="aggregationOptions"
						size="sm"
					/>
				</div>
			</div>
		</template>
	</DashboardChartsBaseCumulatedLineChart>
</template>

<script setup lang="ts">
import { generateCumulatedPnlChartData } from '~/utils/dashboard'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

const props = defineProps({
	startingCapital: { type: Number, default: null },
	loading: { type: Boolean },
})

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { t } = useI18n()
const { canvasHeight } = useEchartsChart()
const { profitColor, lossColor } = useTypeColors('cumulatedPnlChart')
const dataStore = useDataStore()
const dbStateStore = useDbStateStore()
const { getGroupedTrades } = useAggregationCache()

type AggregationMode = 'day' | 'week' | 'month'

const aggregationOptions = computed(() => [
	{ label: t('components.dashboard.index.by_day'), value: 'day' },
	{ label: t('components.dashboard.index.by_week'), value: 'week' },
	{ label: t('components.dashboard.index.by_month'), value: 'month' },
])

const cumuleMode = computed<AggregationMode>({
	get: () => (dbStateStore.chartSettings['cumulatedPnl']?.cumuleMode as AggregationMode) ?? 'week',
	set: (val: AggregationMode) => {
		dbStateStore.chartSettings['cumulatedPnl'] = { ...dbStateStore.chartSettings['cumulatedPnl'], cumuleMode: val }
	},
})

const aggregationLabel = computed(() => {
	const opt = aggregationOptions.value.find(o => o.value === cumuleMode.value)
	return opt?.label ?? ''
})

const userStore = useUserStore()

const rawData = computed(() => generateCumulatedPnlChartData(
	dataStore.lastTrades,
	cumuleMode.value,
	displayModeNet.value,
	userStore.settingsObject,
	getGroupedTrades(cumuleMode.value)
))

const labels = computed(() => {
	const baseLabels = rawData.value.labels as string[]
	if (props.startingCapital && props.startingCapital > 0) {
		return ['', ...baseLabels]
	}
	return baseLabels
})

const values = computed(() => {
	const baseValues = (rawData.value.datasets[0]?.data || []) as number[]
	if (props.startingCapital && props.startingCapital > 0) {
		return [props.startingCapital, ...baseValues.map(v => v + props.startingCapital!)]
	}
	return baseValues
})

const threshold = computed(() => props.startingCapital ?? 0)

const tooltipFormatter = (params: EChartsFormatterParams<number | [number, number]>[], labelsRef: string[]) => {
	const p = params.find((x) => x.value !== null)
	if (!p) return ''
	const xi = Math.round((p.value as [number, number])[0])
	const label = labelsRef[xi] || ''
	const val = (p.value as [number, number])[1]
	return [label ? `Date: ${label}` : '', `${t('components.dashboard.index.cumulated_label')}: ${formatCurrency(val)}`].filter(Boolean).join('<br/>')
}
</script>
