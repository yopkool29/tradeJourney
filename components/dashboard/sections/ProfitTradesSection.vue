<template>
	<DashboardChartsBaseStatsSection
		:title="$t('components.dashboard.profit_trades.title')"
		title-class="text-green-600 dark:text-green-400"
		:rows="rows"
	/>
</template>

<script setup lang="ts">
import { useMetricsBaseSectionPattern } from '~/composables/metrics/useBaseSectionPattern'
import type { StatsRow } from '~/components/dashboard/charts/base/StatsSection.vue'

const { result } = useMetricsBaseSectionPattern()

const maxRunUpDisplayDates = computed(() => {
	const from = result.value.maxRunUpDateFrom ? new Date(result.value.maxRunUpDateFrom) : null
	const to = result.value.maxRunUpDateTo ? new Date(result.value.maxRunUpDateTo) : null

	if (from && to && from > to) {
		return { start: to, end: from }
	}

	return { start: from, end: to }
})

const rows = computed<StatsRow[]>(() => [
	{ label: 'components.dashboard.profit_trades.total_profit', value: result.value.totalProfit, format: 'currency', valueClass: 'profit-text' },
	{ label: 'components.dashboard.profit_trades.winning_trades', value: result.value.winningTradesCount, format: 'number' },
	{ label: 'components.dashboard.profit_trades.winning_contracts', value: result.value.winningContractsCount, format: 'number' },
	{ label: 'components.dashboard.profit_trades.largest_win', value: result.value.largestWin, format: 'currency', valueClass: 'profit-text' },
	{ label: 'components.dashboard.profit_trades.avg_win', value: result.value.avgWin, format: 'currency' },
	{ label: 'components.dashboard.profit_trades.std_dev', value: result.value.stdDevWin, format: 'currency' },
	{ label: 'components.dashboard.profit_trades.commission', value: result.value.winningTradesCommission, format: 'currency' },
	{ label: 'components.dashboard.profit_trades.avg_win_time', value: result.value.avgWinDuration, format: 'duration' },
	{ label: 'components.dashboard.profit_trades.longest_win_time', value: result.value.maxWinDuration, format: 'duration' },
	{ label: 'components.dashboard.profit_trades.max_winning_streak', value: result.value.maxWinningStreak, format: 'number', valueClass: 'profit-text' },
	{ label: 'components.dashboard.profit_trades.max_run_up', value: result.value.maxRunUp, format: 'currency', valueClass: 'profit-text' },
	{ label: 'components.dashboard.profit_trades.max_run_up_from', value: maxRunUpDisplayDates.value.start, format: 'date', small: true, condition: !!maxRunUpDisplayDates.value.start },
	{ label: 'components.dashboard.profit_trades.max_run_up_to', value: maxRunUpDisplayDates.value.end, format: 'date', small: true, condition: !!maxRunUpDisplayDates.value.end },
	{ label: 'components.dashboard.profit_trades.largest_win_date', value: result.value.largestWinDate, format: 'date', small: true, condition: !!result.value.largestWinDate },
])
</script>
