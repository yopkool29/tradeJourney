<template>
	<DashboardChartsBaseScatterChart
		:title="$t(titleKey)"
		:enlarged-title="$t(enlargedTitleKey)"
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
import type { BreakdownMetrics, GroupFn } from '~/composables/useAnalytics'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

type Dimension = 'ticker' | 'tag' | 'side'

const props = defineProps({
	dimension: { type: String as () => Dimension, required: true },
	loading: { type: Boolean },
})

const { t } = useI18n()
const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { profitColor, lossColor } = useTypeColors()
const isDark = useIsDark()
const dataStore = useDataStore()

const dimensionConfig: Record<Dimension, { groupFn: GroupFn; titleKey: string; enlargedTitleKey: string }> = {
	ticker: {
		groupFn: groupByTicker,
		titleKey: 'components.dashboard.ticker_winrate_chart.title',
		enlargedTitleKey: 'components.dashboard.ticker_winrate_chart.enlarged_title',
	},
	tag: {
		groupFn: groupByTag,
		titleKey: 'components.dashboard.tag_winrate_chart.title',
		enlargedTitleKey: 'components.dashboard.tag_winrate_chart.enlarged_title',
	},
	side: {
		groupFn: groupBySide,
		titleKey: 'components.dashboard.side_winrate_chart.title',
		enlargedTitleKey: 'components.dashboard.side_winrate_chart.enlarged_title',
	},
}

const config = computed(() => dimensionConfig[props.dimension])

const metrics = computed<BreakdownMetrics[]>(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByDimension(trades, config.value.groupFn, displayModeNet.value)
})

// Group items with same (tradesCount, winrate rounded to 1 decimal)
const grouped = computed(() => {
	const map = new Map<string, { tradesCount: number, winrate: number, pnl: number, keys: string[] }>()
	metrics.value.forEach((m) => {
		const key = `${m.tradesCount}-${m.winrate.toFixed(1)}`
		const existing = map.get(key)
		if (existing) {
			existing.pnl += m.pnl
			existing.keys.push(m.key)
		} else {
			map.set(key, { tradesCount: m.tradesCount, winrate: m.winrate, pnl: m.pnl, keys: [m.key] })
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
		const isGroup = g.keys.length > 1
		const firstKey = g.keys[0]
		return {
			value: [
				g.tradesCount + getJitter(firstKey),
				g.winrate,
				g.pnl,
				isGroup ? g.keys.join(', ') : firstKey,
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
	const [tradesCount, winrate, pnl, keyOrGroup] = p.value
	const isGroup = keyOrGroup.includes(',')
	const lines = [
		`<strong>${keyOrGroup}</strong>`,
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
	const keys = String(data[3])
	const count = keys.split(',').length
	const baseSize = Math.min(18, Math.max(10, Math.sqrt(pnl) / 10))
	return baseSize * (1 + (count - 1) * 0.3)
}

const titleKey = computed(() => config.value.titleKey)
const enlargedTitleKey = computed(() => config.value.enlargedTitleKey)
</script>
