<template>
	<DashboardChartsBaseEchartsCard
		:title="$t('components.dashboard.winrate_chart.title')"
		:enlarged-title="$t('components.dashboard.winrate_chart.enlarged_title')"
		:chart-option="chartOption"
		:canvas-height="canvasHeight"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import { generateWinrateChartData } from '~/utils/dashboard'

const props = defineProps<{
	loading?: boolean
	layoutKey?: number
}>()

const { t } = useI18n()
const userStore = useUserStore()
const dataStore = useDataStore()
const { displayModeNet } = useNetGrossDisplay()
const { canvasHeight, getBaseChartOption } = useEchartsChart()
const { barColor, movingAverageColor, isDark } = useTypeColors('winrateChart')

const chartOption = computed(() => {
	const raw = generateWinrateChartData(
		dataStore.lastTrades,
		userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year',
		3,
		displayModeNet.value
	)

	const labels = raw.labels as string[]
	const maValues = (raw.datasets[0]?.data || []) as number[]
	const winrateValues = (raw.datasets[1]?.data || []) as number[]
	const base = getBaseChartOption(isDark.value)
	const maColor = movingAverageColor.value || '#6366f1'
	const barFill = barColor.value || '#f472b6'

	return {
		...base,
		grid: { left: 52, right: 16, top: 12, bottom: 28 },
		tooltip: {
			...base.tooltip,
			formatter: (params: any) => {
				const label = params[0]?.axisValue || ''
				const lines = params.map((p: any) => {
					const val = p.value as number
					if (val === null || val === undefined) return null
					return `${p.seriesName}: ${val.toFixed(0)}%`
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
			min: 0,
			max: 100,
			axisLabel: {
				...base.yAxis.axisLabel,
				formatter: (v: number) => `${v}%`,
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
				name: 'Winrate',
				type: 'bar' as const,
				data: winrateValues.map(v => ({
					value: v,
					itemStyle: { color: barFill, borderRadius: [3, 3, 0, 0] },
				})),
				barMaxWidth: 32,
				emphasis: { disabled: true },
			},
		],
	}
})
</script>
