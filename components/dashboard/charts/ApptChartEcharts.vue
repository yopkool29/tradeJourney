<template>
	<DashboardChartsBaseEchartsCard
		:title="$t('components.dashboard.appt_chart.title')"
		:enlarged-title="$t('components.dashboard.appt_chart.enlarged_title')"
		:chart-option="chartOption"
		:canvas-height="canvasHeight"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import { generateApptChartData } from '~/utils/dashboard'

const props = defineProps<{
	loading?: boolean
	layoutKey?: number
}>()

const { formatCurrency } = useUtils()
const { t } = useI18n()
const userStore = useUserStore()
const dataStore = useDataStore()
const { displayModeNet } = useNetGrossDisplay()
const { canvasHeight, getBaseChartOption } = useEchartsChart()
const { movingAverageColor, profitColor, lossColor, isDark } = useTypeColors('apptChart')

const chartOption = computed(() => {
	const raw = generateApptChartData(
		dataStore.lastTrades,
		userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year',
		5,
		displayModeNet.value
	)

	const labels = raw.labels as string[]
	const maValues = (raw.datasets[0]?.data || []) as number[]
	const apptValues = (raw.datasets[1]?.data || []) as number[]
	const base = getBaseChartOption(isDark.value)
	const maColor = movingAverageColor.value || '#6366f1'

	return {
		...base,
		tooltip: {
			...base.tooltip,
			formatter: (params: any) => {
				const label = params[0]?.axisValue || ''
				const lines = params.map((p: any) => {
					const val = p.value as number
					if (val === null || val === undefined) return null
					return `${p.seriesName}: ${formatCurrency(val)}`
				}).filter(Boolean)
				return [label ? `Date: ${label}` : '', ...lines].filter(Boolean).join('<br/>')
			},
		},
		xAxis: {
			...base.xAxis,
			data: labels,
		},
		yAxis: {
			...base.yAxis,
			axisLabel: {
				...base.yAxis.axisLabel,
				formatter: (v: number) => formatCurrency(v),
			},
		},
		series: [
			{
				name: t('components.dashboard.index.mobile_avg_label'),
				type: 'line' as const,
				data: maValues,
				smooth: 0.2,
				symbol: 'circle',
				symbolSize: 4,
				lineStyle: { width: 2, color: maColor },
				itemStyle: { color: maColor },
				emphasis: { disabled: true },
			},
			{
				name: 'APPT',
				type: 'bar' as const,
				data: apptValues.map(v => ({
					value: v,
					itemStyle: {
						color: v >= 0 ? profitColor.value : lossColor.value,
						borderRadius: [3, 3, 0, 0],
					},
				})),
				barMaxWidth: 32,
				emphasis: { disabled: true },
			},
		],
	}
})
</script>
