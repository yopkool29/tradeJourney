<template>
	<DashboardChartsBaseEchartsCard
		:title="$t('components.dashboard.hourly_winrate.title')"
		:enlarged-title="$t('components.dashboard.hourly_winrate.enlarged_title')"
		:chart-option="chartOption"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import { calculateMetricsByHour } from '~/composables/useAnalytics'
import { getEchartsAxisColors } from '~/utils/chart-utils'

const props = defineProps<{
	loading?: boolean
	layoutKey?: number
}>()

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { t } = useI18n()
const dataStore = useDataStore()
const { getBaseChartOption } = useEchartsChart()
const { profitColor, lossColor, breakevenColor, isDark } = useTypeColors()

const userStore = useUserStore()
const settings = computed(() => userStore.user?.settings_object)

const hourlyMetrics = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByHour(
		trades,
		displayModeNet.value,
		settings.value?.timezoneDisplay!,
		settings.value?.timezoneLocal!,
		settings.value?.timezoneUtcOffset!
	)
})

const chartOption = computed(() => {
	const metrics = hourlyMetrics.value
	if (!metrics.length) return {}

	const base = getBaseChartOption(isDark.value)
	const { axisColor, textColor } = getEchartsAxisColors(isDark.value)

	const hours = metrics.map(m => `${m.hour}h`)
	const winrates = metrics.map(m => m.winrate)
	const tradesCounts = metrics.map(m => m.tradesCount)

	return {
		...base,
		grid: { left: 60, right: 16, top: 24, bottom: 40 },
		tooltip: {
			...base.tooltip,
			formatter: (params: any) => {
				const p = Array.isArray(params) ? params[0] : params
				const hour = p.dataIndex
				const m = metrics[hour]
				return [
					`<strong>${m.hour}:00</strong>`,
					`${t('components.dashboard.index.win_rate')}: ${m.winrate.toFixed(1)}%`,
					`${t('components.dashboard.ticker_table.trades')}: ${m.tradesCount}`,
					`${t('components.dashboard.ticker_table.pnl')}: ${formatCurrency(m.pnl)}`,
				].join('<br/>')
			},
		},
		xAxis: {
			type: 'category' as const,
			data: hours,
			axisLine: { lineStyle: { color: axisColor } },
			axisLabel: { color: textColor, fontSize: 10 },
		},
		yAxis: {
			type: 'value' as const,
			min: 0,
			max: 100,
			axisLine: { lineStyle: { color: axisColor } },
			axisLabel: { color: textColor, formatter: (v: number) => `${v}%` },
			splitLine: {
				lineStyle: {
					type: 'dashed' as const,
					color: axisColor,
					opacity: 0.3,
				},
			},
		},
		series: [{
			type: 'bar',
			data: winrates.map((w, i) => ({
				value: w,
				itemStyle: {
					color: tradesCounts[i] > 0
						? (w >= 50 ? profitColor.value : lossColor.value)
						: breakevenColor.value,
					borderRadius: [3, 3, 0, 0],
				},
			})),
			barMaxWidth: 24,
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
