<template>
	<DashboardChartsBaseStatsSection
		:title="$t('components.dashboard.day_statistics.title')"
		:rows="rows"
		:columns="2"
	/>
</template>

<script setup lang="ts">
import type { StatsRow } from '~/components/dashboard/charts/base/StatsSection.vue'
import { useMetricsBaseSectionPattern } from '~/composables/dashboard/useBaseSectionPattern'

const { result, formatCurrency } = useMetricsBaseSectionPattern()

const formatLossValue = (value: number): string => {
	if (value === 0) return formatCurrency(0)
	return formatCurrency(-Math.abs(value))
}

const formatLossPercent = (value: number): string => {
	if (value === 0) return '0%'
	return `-${Math.abs(value).toFixed(2)}%`
}

const rows = computed<StatsRow[]>(() => [
	// Ligne 1 : compteurs globaux
	{ label: 'components.dashboard.day_statistics.total_trading_days', value: result.value.totalTradingDays, format: 'number' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.breakeven_days', value: result.value.breakevenDays, format: 'number' } satisfies StatsRow,
	// Ligne 2 : gagnants vs perdants
	{ label: 'components.dashboard.day_statistics.winning_days', value: result.value.winningDays, format: 'number', valueClass: 'profit-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.losing_days', value: result.value.losingDays, format: 'number', valueClass: 'loss-text' } satisfies StatsRow,
	// Ligne 3 : séries consécutives
	{ label: 'components.dashboard.day_statistics.max_consecutive_winning_days', value: result.value.maxConsecutiveWinningDays, format: 'number', valueClass: 'profit-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.max_consecutive_losing_days', value: result.value.maxConsecutiveLosingDays, format: 'number', valueClass: 'loss-text' } satisfies StatsRow,
	// Ligne 4 : taux de réussite
	{ label: 'components.dashboard.day_statistics.winning_weeks_percent', value: result.value.winningWeeksPercent, format: 'percent', valueClass: 'profit-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.winning_months_percent', value: result.value.winningMonthsPercent, format: 'percent', valueClass: 'profit-text' } satisfies StatsRow,
	// Ligne 5 : moyennes journalières
	{ label: 'components.dashboard.day_statistics.average_winning_day_pnl', value: result.value.averageWinningDayPnl, format: 'currency', valueClass: 'profit-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.average_losing_day_pnl', value: result.value.averageLosingDayPnl, format: 'currency', valueClass: 'loss-text' } satisfies StatsRow,
	// Ligne 6 : extrêmes
	{ label: 'components.dashboard.day_statistics.largest_profitable_day_pnl', value: result.value.largestProfitableDayPnl, format: 'currency', valueClass: 'profit-text' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.largest_losing_day_pnl', value: result.value.largestLosingDayPnl, format: 'currency', valueClass: 'loss-text' } satisfies StatsRow,
	// Ligne 7 : dates des extrêmes
	{ label: 'components.dashboard.day_statistics.largest_profitable_day_date', value: result.value.largestProfitableDayDate, format: 'dateOnly' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.largest_losing_day_date', value: result.value.largestLosingDayDate, format: 'dateOnly' } satisfies StatsRow,
	// Ligne 8 : drawdown
	{ label: 'components.dashboard.day_statistics.daily_max_drawdown', displayValue: formatLossValue(result.value.dailyMaxDrawdown), valueClass: result.value.dailyMaxDrawdown !== 0 ? 'loss-text' : '' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.daily_max_drawdown_percent', displayValue: formatLossPercent(result.value.dailyMaxDrawdownPercent), valueClass: result.value.dailyMaxDrawdownPercent !== 0 ? 'loss-text' : '' } satisfies StatsRow,
	// Ligne 9 : drawdown moyen
	{ label: 'components.dashboard.day_statistics.average_drawdown', displayValue: formatLossValue(result.value.averageDrawdown), valueClass: result.value.averageDrawdown !== 0 ? 'loss-text' : '' } satisfies StatsRow,
	{ label: 'components.dashboard.day_statistics.average_drawdown_percent', displayValue: formatLossPercent(result.value.averageDrawdownPercent), valueClass: result.value.averageDrawdownPercent !== 0 ? 'loss-text' : '' } satisfies StatsRow,
	// Ligne 10 : P&L moyen (seul, en col-span-2)
	{ label: 'components.dashboard.day_statistics.average_daily_pnl', value: result.value.averageDailyPnl, format: 'currency', valueClass: result.value.averageDailyPnl >= 0 ? 'profit-text' : 'loss-text', borderTop: true } satisfies StatsRow,
])
</script>
