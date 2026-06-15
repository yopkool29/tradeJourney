<template>
	<DashboardChartsBaseHorizontalBarChart
		:title="$t('components.dashboard.ticker_pnl_chart.title')"
		:enlarged-title="$t('components.dashboard.ticker_pnl_chart.enlarged_title')"
		:categories="categories"
		:data="barData"
		:colors="colors"
		:tooltip-formatter="tooltipFormatter"
		:x-axis-formatter="formatCurrency"
		:label-formatter="labelFormatter"
		:loading="loading"
		:modal-height-class="categories.length > 10 ? 'h-[300px] sm:h-[700px]' : undefined"
	/>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import { buildBarColors, buildBarData } from '~/utils/echarts-builders'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

defineProps({
	loading: { type: Boolean },
})

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { t } = useI18n()
const { profitColor, lossColor, breakevenColor } = useTypeColors()
const dataStore = useDataStore()
const { calculateMetricsByTicker } = useAnalytics()

const tickerMetrics = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByTicker(trades, displayModeNet.value)
})

const categories = computed(() => tickerMetrics.value.map(m => m.symbol))
const values = computed(() => tickerMetrics.value.map(m => m.pnl))
const colors = computed(() => buildBarColors(values.value, profitColor.value, lossColor.value, breakevenColor.value))

const barData = computed(() => buildBarData(values.value, colors.value, v => v >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3]))

const tooltipFormatter = (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
	const p = Array.isArray(params) ? params[0] : params
	const metric = tickerMetrics.value[p.dataIndex]
	const lines = [
		`<strong>${metric.symbol}</strong>`,
		`${t('components.dashboard.ticker_table.pnl')}: ${formatCurrency(metric.pnl)}`,
		`${t('components.dashboard.ticker_table.trades')}: ${metric.tradesCount}`,
		`${t('components.dashboard.ticker_table.winrate')}: ${metric.winrate.toFixed(1)}%`,
		`${t('components.dashboard.ticker_table.profit_factor')}: ${metric.profitFactor === Infinity ? '∞' : metric.profitFactor.toFixed(2)}`,
		`${t('components.dashboard.ticker_table.avg_win')}: ${formatCurrency(metric.avgWin)}`,
		`${t('components.dashboard.ticker_table.avg_loss')}: ${formatCurrency(metric.avgLoss)}`,
	].filter(Boolean)
	return lines.join('<br/>')
}

const labelFormatter = (params: EChartsFormatterParams) => formatCurrency(params.value)
</script>
