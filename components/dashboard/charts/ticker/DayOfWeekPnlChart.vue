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

defineProps({
	loading: { type: Boolean },
})

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { t } = useI18n()
const { profitColor, lossColor } = useTypeColors()
const isDark = useIsDark()
const dataStore = useDataStore()

const dayNamesBase = computed(() => [
	t('components.dashboard.day_of_week.monday'),
	t('components.dashboard.day_of_week.tuesday'),
	t('components.dashboard.day_of_week.wednesday'),
	t('components.dashboard.day_of_week.thursday'),
	t('components.dashboard.day_of_week.friday'),
])

const dayNamesWithWeekend = computed(() => [
	...dayNamesBase.value,
	t('components.dashboard.day_of_week.saturday'),
	t('components.dashboard.day_of_week.sunday'),
])

// Helper to convert getDay() (0=Sunday, 6=Saturday) to our day numbering (1=Monday, 7=Sunday)
const getDayNumber = (jsDay: number): number => {
	// jsDay: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
	// Our numbering: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
	return jsDay === 0 ? 7 : jsDay
}

const dayMetrics = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []

	// Check for weekend trades
	const hasWeekendTrades = trades.some(t => {
		const day = new Date(t.openDate).getDay()
		return day === 0 || day === 6 // Sunday or Saturday
	})

	const dayCount = hasWeekendTrades ? 7 : 5
	const dayNames = hasWeekendTrades ? dayNamesWithWeekend.value : dayNamesBase.value

	const metrics = Array.from({ length: dayCount }, (_, i) => ({
		day: i + 1,
		dayName: dayNames[i],
		totalPnl: 0,
		tradesCount: 0,
		winrate: 0,
		avgPnl: 0,
	}))

	for (const trade of trades) {
		const date = new Date(trade.openDate)
		const jsDay = date.getDay()
		const dayNum = getDayNumber(jsDay) // 1-7
		if (dayNum <= dayCount) {
			const idx = dayNum - 1
			const pnl = displayModeNet.value ? trade.netProfit : trade.profit
			metrics[idx].totalPnl += pnl
			metrics[idx].tradesCount += 1
		}
	}

	for (const m of metrics) {
		if (m.tradesCount > 0) {
			m.avgPnl = m.totalPnl / m.tradesCount
			const dayTrades = trades.filter(t => {
				const d = getDayNumber(new Date(t.openDate).getDay())
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
