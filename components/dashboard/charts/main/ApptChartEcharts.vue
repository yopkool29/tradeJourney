<template>
	<DashboardChartsBaseCartesianChart
		:title="$t('components.dashboard.appt_chart.title')"
		:enlarged-title="$t('components.dashboard.appt_chart.enlarged_title')"
		:labels="labels"
		:series="series"
		:tooltip-formatter="tooltipFormatter"
		:y-axis-formatter="formatCurrency"
		:canvas-height="canvasHeight"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import { generateApptChartData } from '~/utils/dashboard'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

type ApptFormatterParams = EChartsFormatterParams & { axisValue?: string }

defineProps({
	loading: { type: Boolean },
})

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { t } = useI18n()
const { canvasHeight } = useEchartsChart()
const { movingAverageColor, profitColor, lossColor } = useTypeColors('apptChart')
const dataStore = useDataStore()
const userStore = useUserStore()

const rawData = computed(() => generateApptChartData(
	dataStore.lastTrades,
	userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year',
	5,
	displayModeNet.value
))

const labels = computed(() => rawData.value.labels as string[])
const maValues = computed(() => (rawData.value.datasets[0]?.data || []) as number[])
const apptValues = computed(() => (rawData.value.datasets[1]?.data || []) as number[])
const maColor = computed(() => movingAverageColor.value || '#6366f1')

const series = computed(() => [
	{
		type: 'line' as const,
		name: t('components.dashboard.index.mobile_avg_label'),
		data: maValues.value,
		color: maColor.value,
	},
	{
		type: 'bar' as const,
		name: 'APPT',
		data: apptValues.value.map((v: number) => ({
			value: v,
			itemStyle: {
				color: v >= 0 ? profitColor.value : lossColor.value,
				borderRadius: v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3],
			},
		})),
		barMaxWidth: 32,
		emphasis: { disabled: true },
	},
])

const tooltipFormatter = (params: ApptFormatterParams[]) => {
	const label = params[0]?.axisValue || ''
	const lines = params.map((p: ApptFormatterParams) => {
		const val = p.value as number
		if (val === null || val === undefined) return null
		return `${p.seriesName}: ${formatCurrency(val)}`
	}).filter(Boolean)
	return [label ? `Date: ${label}` : '', ...lines].filter(Boolean).join('<br/>')
}
</script>
