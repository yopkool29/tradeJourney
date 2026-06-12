<template>
	<DashboardChartsBaseEchartsCard
		:title="$t('components.dashboard.hourly_heatmap.title')"
		:enlarged-title="$t('components.dashboard.hourly_heatmap.enlarged_title')"
		:chart-option="chartOption"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import { calculateHourlyHeatmapData } from '~/composables/useAnalytics'
import { getEchartsAxisColors } from '~/utils/chart-utils'

const props = defineProps<{
	loading?: boolean
	layoutKey?: number
}>()

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const dataStore = useDataStore()
const { getBaseChartOption } = useEchartsChart()
const { profitColor, lossColor, isDark } = useTypeColors()

const heatmapData = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateHourlyHeatmapData(trades)
})

const { t } = useI18n()

const weekdayLabels = computed(() => [
	t('common.weekdays.short.monday'),
	t('common.weekdays.short.tuesday'),
	t('common.weekdays.short.wednesday'),
	t('common.weekdays.short.thursday'),
	t('common.weekdays.short.friday'),
])

const chartOption = computed(() => {
	const data = heatmapData.value
	if (!data.length) return {}

	const base = getBaseChartOption(isDark.value)
	const { axisColor, textColor } = getEchartsAxisColors(isDark.value)

	const maxAbsPnl = Math.max(...data.map(d => Math.abs(d.pnl)), 1)

	return {
		...base,
		grid: { left: 60, right: 16, top: 24, bottom: 40 },
		tooltip: {
			...base.tooltip,
			trigger: 'item' as const,
			formatter: (params: any) => {
				const p = Array.isArray(params) ? params[0] : params
				const hour = p.value[0]
				const weekday = p.value[1]
				const pnl = p.value[2]
				return [
					`<strong>${weekday} ${hour}:00</strong>`,
					`Avg P&L: ${formatCurrency(pnl)}`,
				].join('<br/>')
			},
		},
		xAxis: {
			type: 'category' as const,
			data: Array.from({ length: 24 }, (_, i) => `${i}h`),
			splitArea: { show: true },
			axisLine: { lineStyle: { color: axisColor } },
			axisLabel: { color: textColor, fontSize: 10 },
			axisPointer: { show: false },
		},
		yAxis: {
			type: 'category' as const,
			data: weekdayLabels.value,
			inverse: true,
			splitArea: { show: true },
			axisLine: { lineStyle: { color: axisColor } },
			axisLabel: { color: textColor },
		},
		visualMap: {
			min: -maxAbsPnl,
			max: maxAbsPnl,
			calculable: true,
			orient: 'horizontal' as const,
			left: 'center',
			bottom: 0,
			show: false,
			inRange: {
				color: ['#000000', '#2a1500', '#552a00', '#803f00', '#ab5500', '#d66a00', '#ff8000', '#ffaa33', '#ffd480', '#fff5cc'],
			},
			outOfRange: {
				color: isDark.value ? '#111827' : '#f3f4f6',
			},
		},
		series: [{
			name: 'Avg P&L',
			type: 'heatmap',
			data: data.map(d => [d.hour, weekdayLabels.value[d.weekday - 1], d.pnl]),
			label: {
				show: false,
			},
			emphasis: {
				itemStyle: {
					borderColor: isDark.value ? '#ffffff' : '#1f2937',
					borderWidth: 2,
				},
			},
		}],
	}
})
</script>
