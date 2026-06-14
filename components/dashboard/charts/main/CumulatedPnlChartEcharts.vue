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
	/>
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
const userStore = useUserStore()

const rawData = computed(() => generateCumulatedPnlChartData(
	dataStore.lastTrades,
	userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year',
	displayModeNet.value
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
