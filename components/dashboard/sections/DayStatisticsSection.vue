<template>
	<DashboardChartsBaseStatsSection
		:title="$t('components.dashboard.day_statistics.title')"
		:rows="rows"
	/>
</template>

<script setup lang="ts">
import type { StatsRow } from '~/components/dashboard/charts/base/StatsSection.vue'
import { useMetricsBaseSectionPattern } from '~/composables/metrics/useBaseSectionPattern'

const { result } = useMetricsBaseSectionPattern()

const rows = computed<StatsRow[]>(() => [
	{ label: 'components.dashboard.day_statistics.total_trading_days', value: result.value.totalTradingDays, format: 'number' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.winning_days', value: result.value.winningDays, format: 'number', valueClass: 'profit-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.losing_days', value: result.value.losingDays, format: 'number', valueClass: 'loss-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.breakeven_days', value: result.value.breakevenDays, format: 'number' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.max_consecutive_winning_days', value: result.value.maxConsecutiveWinningDays, format: 'number', valueClass: 'profit-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.max_consecutive_losing_days', value: result.value.maxConsecutiveLosingDays, format: 'number', valueClass: 'loss-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.average_daily_pnl', value: result.value.averageDailyPnl, format: 'currency', valueClass: result.value.averageDailyPnl >= 0 ? 'profit-text' : 'loss-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.average_winning_day_pnl', value: result.value.averageWinningDayPnl, format: 'currency', valueClass: 'profit-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.average_losing_day_pnl', value: result.value.averageLosingDayPnl, format: 'currency', valueClass: 'loss-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.largest_profitable_day_pnl', value: result.value.largestProfitableDayPnl, format: 'currency', valueClass: 'profit-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.largest_profitable_day_date', value: result.value.largestProfitableDayDate?.toISOString(), format: 'date', condition: !!result.value.largestProfitableDayDate } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.largest_losing_day_pnl', value: result.value.largestLosingDayPnl, format: 'currency', valueClass: 'loss-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.largest_losing_day_date', value: result.value.largestLosingDayDate?.toISOString(), format: 'date', condition: !!result.value.largestLosingDayDate } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.daily_max_drawdown', value: result.value.dailyMaxDrawdown, format: 'currency', valueClass: 'loss-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.daily_max_drawdown_percent', value: result.value.dailyMaxDrawdownPercent, format: 'percent', valueClass: 'loss-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.average_drawdown', value: result.value.averageDrawdown, format: 'currency', valueClass: 'loss-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.average_drawdown_percent', value: result.value.averageDrawdownPercent, format: 'percent', valueClass: 'loss-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.open_trades', value: result.value.openTrades, format: 'number', borderTop: true } satisfies StatsRow,
])
</script>
