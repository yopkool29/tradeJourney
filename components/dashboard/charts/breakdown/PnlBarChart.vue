<template>
	<DashboardChartsBaseHorizontalBarChart
		:title="$t(titleKey)"
		:enlarged-title="$t(enlargedTitleKey)"
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
import type { BreakdownMetrics, GroupFn } from '~/composables/useAnalytics'
import { buildBarColors, buildBarData } from '~/utils/echarts-builders'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

type Dimension = 'ticker' | 'tag' | 'side'

const props = defineProps({
	dimension: { type: String as () => Dimension, required: true },
	loading: { type: Boolean },
})

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { t } = useI18n()
const { profitColor, lossColor, breakevenColor } = useTypeColors()
const dataStore = useDataStore()

// Mapping dimension → groupFn + clés i18n
const dimensionConfig: Record<Dimension, { groupFn: GroupFn; titleKey: string; enlargedTitleKey: string; tooltipKeys: { pnl: string; trades: string; winrate: string; profitFactor: string; avgWin: string; avgLoss: string } }> = {
	ticker: {
		groupFn: groupByTicker,
		titleKey: 'components.dashboard.ticker_pnl_chart.title',
		enlargedTitleKey: 'components.dashboard.ticker_pnl_chart.enlarged_title',
		tooltipKeys: {
			pnl: 'components.dashboard.ticker_table.pnl',
			trades: 'components.dashboard.ticker_table.trades',
			winrate: 'components.dashboard.ticker_table.winrate',
			profitFactor: 'components.dashboard.ticker_table.profit_factor',
			avgWin: 'components.dashboard.ticker_table.avg_win',
			avgLoss: 'components.dashboard.ticker_table.avg_loss',
		},
	},
	tag: {
		groupFn: groupByTag,
		titleKey: 'components.dashboard.tag_pnl_chart.title',
		enlargedTitleKey: 'components.dashboard.tag_pnl_chart.enlarged_title',
		tooltipKeys: {
			pnl: 'components.dashboard.ticker_table.pnl',
			trades: 'components.dashboard.ticker_table.trades',
			winrate: 'components.dashboard.ticker_table.winrate',
			profitFactor: 'components.dashboard.ticker_table.profit_factor',
			avgWin: 'components.dashboard.ticker_table.avg_win',
			avgLoss: 'components.dashboard.ticker_table.avg_loss',
		},
	},
	side: {
		groupFn: groupBySide,
		titleKey: 'components.dashboard.side_pnl_chart.title',
		enlargedTitleKey: 'components.dashboard.side_pnl_chart.enlarged_title',
		tooltipKeys: {
			pnl: 'components.dashboard.ticker_table.pnl',
			trades: 'components.dashboard.ticker_table.trades',
			winrate: 'components.dashboard.ticker_table.winrate',
			profitFactor: 'components.dashboard.ticker_table.profit_factor',
			avgWin: 'components.dashboard.ticker_table.avg_win',
			avgLoss: 'components.dashboard.ticker_table.avg_loss',
		},
	},
}

const config = computed(() => dimensionConfig[props.dimension])

const metrics = computed<BreakdownMetrics[]>(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByDimension(trades, config.value.groupFn, displayModeNet.value)
})

const categories = computed(() => metrics.value.map(m => m.key))
const values = computed(() => metrics.value.map(m => m.pnl))
const colors = computed(() => buildBarColors(values.value, profitColor.value, lossColor.value, breakevenColor.value))

const barData = computed(() => buildBarData(values.value, colors.value, v => v >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3]))

const tooltipFormatter = (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
	const p = Array.isArray(params) ? params[0] : params
	const metric = metrics.value[p.dataIndex]
	const keys = config.value.tooltipKeys
	const lines = [
		`<strong>${metric.key}</strong>`,
		`${t(keys.pnl)}: ${formatCurrency(metric.pnl)}`,
		`${t(keys.trades)}: ${metric.tradesCount}`,
		`${t(keys.winrate)}: ${metric.winrate.toFixed(1)}%`,
		`${t(keys.profitFactor)}: ${metric.profitFactor === Infinity ? '∞' : metric.profitFactor.toFixed(2)}`,
		`${t(keys.avgWin)}: ${formatCurrency(metric.avgWin)}`,
		`${t(keys.avgLoss)}: ${formatCurrency(metric.avgLoss)}`,
	].filter(Boolean)
	return lines.join('<br/>')
}

const labelFormatter = (params: EChartsFormatterParams) => formatCurrency(params.value)

const titleKey = computed(() => config.value.titleKey)
const enlargedTitleKey = computed(() => config.value.enlargedTitleKey)
</script>
