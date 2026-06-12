<template>
	<DashboardChartsBaseCartesianChart
		:title="$t('components.dashboard.day_of_week.title')"
		:enlarged-title="$t('components.dashboard.day_of_week.enlarged_title')"
		:labels="labels"
		:series="series"
		:tooltip-formatter="tooltipFormatter"
		:y-axis-formatter="(v: number) => formatCurrency(v)"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'

const props = defineProps({
	loading: { type: Boolean },
	layoutKey: { type: Number },
})

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { t } = useI18n()
const { profitColor, lossColor } = useTypeColors()
const isDark = useIsDark()
const dataStore = useDataStore()

const dayNames = [
	t('components.dashboard.day_of_week.monday'),
	t('components.dashboard.day_of_week.tuesday'),
	t('components.dashboard.day_of_week.wednesday'),
	t('components.dashboard.day_of_week.thursday'),
	t('components.dashboard.day_of_week.friday'),
]

const dayMetrics = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []

	const metrics = Array.from({ length: 5 }, (_, i) => ({
		day: i + 1,
		dayName: dayNames[i],
		totalPnl: 0,
		tradesCount: 0,
		winrate: 0,
		avgPnl: 0,
	}))

	for (const trade of trades) {
		const date = new Date(trade.openDate)
		const day = date.getDay()
		if (day >= 1 && day <= 5) {
			const idx = day - 1
			const pnl = displayModeNet.value ? trade.netProfit : trade.profit
			metrics[idx].totalPnl += pnl
			metrics[idx].tradesCount += 1
		}
	}

	for (const m of metrics) {
		if (m.tradesCount > 0) {
			m.avgPnl = m.totalPnl / m.tradesCount
			const dayTrades = trades.filter(t => {
				const d = new Date(t.openDate).getDay()
				return d === m.day
			})
			const winners = dayTrades.filter(t => (displayModeNet.value ? t.netProfit : t.profit) > 0)
			m.winrate = dayTrades.length > 0 ? (winners.length / dayTrades.length) * 100 : 0
		}
	}

	return metrics
})

const labels = computed(() => dayMetrics.value.map(m => m.dayName))

const series = computed(() => [{
	type: 'bar' as const,
	name: t('components.dashboard.day_of_week.avg_pnl'),
	data: dayMetrics.value.map(m => ({
		value: m.avgPnl,
		itemStyle: {
			color: m.avgPnl >= 0 ? profitColor.value : lossColor.value,
			borderRadius: m.avgPnl >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3],
		},
	})),
	barMaxWidth: 40,
	emphasis: {
		itemStyle: {
			borderColor: isDark.value ? '#ffffff' : '#1f2937',
			borderWidth: 2,
		},
	},
}])

const tooltipFormatter = (params: any) => {
	const p = Array.isArray(params) ? params[0] : params
	const idx = p.dataIndex
	const m = dayMetrics.value[idx]
	return [
		`<strong>${m.dayName}</strong>`,
		`${t('components.dashboard.ticker_table.pnl')}: ${formatCurrency(m.totalPnl)}`,
		`${t('components.dashboard.day_of_week.avg_pnl')}: ${formatCurrency(m.avgPnl)}`,
		`${t('components.dashboard.index.win_rate')}: ${m.winrate.toFixed(1)}%`,
		`${t('components.dashboard.ticker_table.trades')}: ${m.tradesCount}`,
	].join('<br/>')
}
</script>
