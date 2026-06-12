<template>
	<DashboardChartsBaseCartesianChart
		:title="$t('components.dashboard.winrate_chart.title')"
		:enlarged-title="$t('components.dashboard.winrate_chart.enlarged_title')"
		:labels="labels"
		:series="series"
		:tooltip-formatter="tooltipFormatter"
		:y-axis-min="0"
		:y-axis-max="100"
		:y-axis-formatter="(v: number) => `${v}%`"
		:canvas-height="canvasHeight"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import { generateWinrateChartData } from '~/utils/dashboard'

const props = defineProps({
	loading: { type: Boolean },
	layoutKey: { type: Number },
})

const { displayModeNet } = useNetGrossDisplay()
const { t } = useI18n()
const { canvasHeight } = useEchartsChart()
const { barColor, movingAverageColor } = useTypeColors('winrateChart')
const dataStore = useDataStore()
const userStore = useUserStore()

const rawData = computed(() => generateWinrateChartData(
	dataStore.lastTrades,
	userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year',
	3,
	displayModeNet.value
))

const labels = computed(() => rawData.value.labels as string[])
const maValues = computed(() => (rawData.value.datasets[0]?.data || []) as number[])
const winrateValues = computed(() => (rawData.value.datasets[1]?.data || []) as number[])
const maColor = computed(() => movingAverageColor.value || '#6366f1')
const barFill = computed(() => barColor.value || '#f472b6')

const series = computed(() => [
	{
		type: 'line' as const,
		name: t('components.dashboard.index.mobile_avg_label'),
		data: maValues.value,
		color: maColor.value,
	},
	{
		type: 'bar' as const,
		name: 'Winrate',
		data: winrateValues.value.map((v: number) => ({
			value: v,
			itemStyle: { color: barFill.value, borderRadius: [3, 3, 0, 0] },
		})),
		barMaxWidth: 32,
		emphasis: { disabled: true },
	},
])

const tooltipFormatter = (params: any) => {
	const label = params[0]?.axisValue || ''
	const lines = params.map((p: any) => {
		const val = p.value as number
		if (val === null || val === undefined) return null
		return `${p.seriesName}: ${val.toFixed(0)}%`
	}).filter(Boolean)
	return [label ? `Date: ${label}` : '', ...lines].filter(Boolean).join('<br/>')
}
</script>
