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
const { profitColor, lossColor, isDark } = useTypeColors()
const { calculateMetricsByTicker } = useAnalytics()
import { getEchartsAxisColors } from '~/utils/chart-utils'

const tickerMetrics = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByTicker(trades, displayModeNet.value)
})

const chartOption = computed(() => {
	const metrics = tickerMetrics.value

	// Group tickers with same (tradesCount, winrate rounded to 1 decimal)
	const grouped = new Map<string, { tradesCount: number, winrate: number, pnl: number, symbols: string[] }>()
	metrics.forEach((m) => {
		const key = `${m.tradesCount}-${m.winrate.toFixed(1)}`
		const existing = grouped.get(key)
		if (existing) {
			existing.pnl += m.pnl
			existing.symbols.push(m.symbol)
		} else {
			grouped.set(key, { tradesCount: m.tradesCount, winrate: m.winrate, pnl: m.pnl, symbols: [m.symbol] })
		}
	})

	// Slight jitter based on symbol name to avoid exact vertical overlap on same x
	const getJitter = (str: string): number => {
		let hash = 0
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash) + str.charCodeAt(i)
			hash |= 0
		}
		return ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.16
	}

	const scatterData = Array.from(grouped.values()).map((g) => {
		const isGroup = g.symbols.length > 1
		const firstSymbol = g.symbols[0]
		return {
			value: [
				g.tradesCount + getJitter(firstSymbol),
				g.winrate,
				g.pnl,
				isGroup ? g.symbols.join(', ') : firstSymbol,
			],
			itemStyle: {
				color: g.pnl > 0 ? profitColor.value : g.pnl < 0 ? lossColor.value : neutralColor.value,
				borderColor: isDark.value ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)',
				borderWidth: 1,
				borderType: 'solid' as const,
			},
		}
	})

	const base = getBaseChartOption(isDark.value)
	const { axisColor, textColor } = getEchartsAxisColors(isDark.value)

	return {
		...base,
		grid: { left: 60, right: 16, top: 24, bottom: 40 },
		tooltip: {
			...base.tooltip,
			formatter: (params: any) => {
				const p = Array.isArray(params) ? params[0] : params
				const [tradesCount, winrate, pnl, symbolOrGroup] = p.value
				const isGroup = symbolOrGroup.includes(',')
				const lines = [
					`<strong>${symbolOrGroup}</strong>`,
					`Trades: ${Math.round(tradesCount)}`,
					`Winrate: ${winrate.toFixed(1)}%`,
					`P&L: ${formatCurrency(pnl)}`,
				]
				if (isGroup) {
					lines.push('<em>(multiple tickers grouped)</em>')
				}
				return lines.join('<br/>')
			},
		},
		xAxis: {
			type: 'value' as const,
			name: 'Nb Trades',
			nameLocation: 'middle' as const,
			nameGap: 25,
			axisLine: { lineStyle: { color: axisColor } },
			axisLabel: { color: textColor },
			nameTextStyle: { color: textColor },
			splitLine: {
				lineStyle: {
					type: 'dashed' as const,
					color: axisColor,
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
			axisLine: { lineStyle: { color: axisColor } },
			axisLabel: { color: textColor },
			nameTextStyle: { color: textColor },
			splitLine: {
				lineStyle: {
					type: 'dashed' as const,
					color: axisColor,
					opacity: 0.3,
				},
			},
		},
		series: [{
			type: 'scatter',
			symbolSize: (data: number[]) => {
				const pnl = Math.abs(data[2])
				const symbols = data[3] as string
				const count = symbols.split(',').length
				const baseSize = Math.min(18, Math.max(10, Math.sqrt(pnl) / 10))
				return baseSize * (1 + (count - 1) * 0.3)
			},
			data: scatterData,
			emphasis: {
				scale: 1.3,
				itemStyle: {
					borderColor: isDark.value ? '#ffffff' : '#1f2937',
					borderWidth: 2,
				},
			},
		}],
	}
})
</script>
