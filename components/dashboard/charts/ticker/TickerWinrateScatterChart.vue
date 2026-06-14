<template>
	<DashboardChartsBaseScatterChart
		:title="$t('components.dashboard.ticker_winrate_chart.title')"
		:enlarged-title="$t('components.dashboard.ticker_winrate_chart.enlarged_title')"
		:data="scatterData"
		:x-axis-name="t('components.dashboard.ticker_table.trades')"
		:y-axis-name="'Winrate (%)'"
		:y-axis-min="0"
		:y-axis-max="100"
		:tooltip-formatter="tooltipFormatter"
		:symbol-size="symbolSize"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

defineProps({
	loading: { type: Boolean },
})

const { t } = useI18n()
const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { profitColor, lossColor } = useTypeColors()
const isDark = useIsDark()
const dataStore = useDataStore()
const { calculateMetricsByTicker } = useAnalytics()

const tickerMetrics = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByTicker(trades, displayModeNet.value)
})

// Group tickers with same (tradesCount, winrate rounded to 1 decimal)
const grouped = computed(() => {
	const map = new Map<string, { tradesCount: number, winrate: number, pnl: number, symbols: string[] }>()
	tickerMetrics.value.forEach((m) => {
		const key = `${m.tradesCount}-${m.winrate.toFixed(1)}`
		const existing = map.get(key)
		if (existing) {
			existing.pnl += m.pnl
			existing.symbols.push(m.symbol)
		} else {
			map.set(key, { tradesCount: m.tradesCount, winrate: m.winrate, pnl: m.pnl, symbols: [m.symbol] })
		}
	})
	return Array.from(map.values())
})

const getJitter = (str: string): number => {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash) + str.charCodeAt(i)
		hash |= 0
	}
	return ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.16
}

const scatterData = computed(() => {
	return grouped.value.map((g) => {
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
				color: g.pnl > 0 ? profitColor.value : g.pnl < 0 ? lossColor.value : '#9ca3af',
				borderColor: isDark.value ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)',
				borderWidth: 1,
				borderType: 'solid' as const,
			},
		}
	})
})

const tooltipFormatter = (params: EChartsFormatterParams<[number, number, number, string]> | EChartsFormatterParams<[number, number, number, string]>[]) => {
	const p = Array.isArray(params) ? params[0] : params
	const [tradesCount, winrate, pnl, symbolOrGroup] = p.value
	const isGroup = symbolOrGroup.includes(',')
	const lines = [
		`<strong>${symbolOrGroup}</strong>`,
		`${t('components.dashboard.ticker_table.trades')}: ${Math.round(tradesCount)}`,
		`${t('components.dashboard.ticker_table.winrate')}: ${winrate.toFixed(1)}%`,
		`${t('components.dashboard.ticker_table.pnl')}: ${formatCurrency(pnl)}`,
	]
	if (isGroup) {
		lines.push(`<em>(${t('components.dashboard.ticker_table.multiple_tickers')})</em>`)
	}   
	return lines.join('<br/>')
}

const symbolSize = (data: unknown[]) => {
	const pnl = Math.abs(data[2] as number)
	const symbols = String(data[3])
	const count = symbols.split(',').length
	const baseSize = Math.min(18, Math.max(10, Math.sqrt(pnl) / 10))
	return baseSize * (1 + (count - 1) * 0.3)
}
</script>
