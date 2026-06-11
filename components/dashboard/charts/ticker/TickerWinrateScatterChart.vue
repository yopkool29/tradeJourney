<template>
	<DashboardChartsBaseEchartsCard
		:title="$t('components.dashboard.ticker_winrate_chart.title')"
		:enlarged-title="$t('components.dashboard.ticker_winrate_chart.enlarged_title')"
		:chart-option="chartOption"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'

const props = defineProps<{
	loading?: boolean
	layoutKey?: number
}>()

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { locale } = useI18n()
const userStore = useUserStore()
const dataStore = useDataStore()
const appConfig = useAppConfig()
const { getBaseChartOption } = useEchartsChart()
const { profitColor, lossColor, neutralColor, isDark } = useTypeColors()
const { calculateMetricsByTicker } = useAnalytics()

const tickerMetrics = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByTicker(trades, displayModeNet.value)
})

const chartOption = computed(() => {
	const metrics = tickerMetrics.value

	const scatterData = metrics.map(m => ({
		value: [m.tradesCount, m.winrate, m.pnl, m.symbol],
		itemStyle: {
			color: m.pnl > 0 ? profitColor.value : m.pnl < 0 ? lossColor.value : neutralColor.value,
		},
	}))

	const base = getBaseChartOption(isDark.value)

	return {
		...base,
		grid: { left: 60, right: 16, top: 24, bottom: 40 },
		tooltip: {
			...base.tooltip,
			formatter: (params: any) => {
				const p = Array.isArray(params) ? params[0] : params
				const [tradesCount, winrate, pnl, symbol] = p.value
				const lines = [
					`<strong>${symbol}</strong>`,
					`Trades: ${tradesCount}`,
					`Winrate: ${winrate.toFixed(1)}%`,
					`P&L: ${formatCurrency(pnl)}`,
				].filter(Boolean)
				return lines.join('<br/>')
			},
		},
		xAxis: {
			type: 'value' as const,
			name: 'Nb Trades',
			nameLocation: 'middle' as const,
			nameGap: 25,
			splitLine: {
				lineStyle: {
					type: 'dashed' as const,
					opacity: 0.3,
				},
			},
		},
		yAxis: {
			type: 'value' as const,
			name: 'Winrate (%)',
			nameLocation: 'middle' as const,
			nameGap: 35,
			min: 0,
			max: 100,
			splitLine: {
				lineStyle: {
					type: 'dashed' as const,
					opacity: 0.3,
				},
			},
		},
		series: [{
			type: 'scatter',
			symbolSize: (data: number[]) => {
				// Size based on absolute PnL (min 8, max 24)
				const pnl = Math.abs(data[2])
				return Math.min(24, Math.max(8, Math.sqrt(pnl) / 10))
			},
			data: scatterData,
			emphasis: {
				focus: 'series',
				itemStyle: {
					borderColor: '#fff',
					borderWidth: 2,
				},
			},
		}],
	}
})
</script>
