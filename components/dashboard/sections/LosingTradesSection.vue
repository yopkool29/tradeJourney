<template>
	<DashboardChartsBaseStatsSection
		:title="$t('components.dashboard.losing_trades.title')"
		title-class="text-red-600 dark:text-red-400"
		:rows="rows"
	/>
</template>

<script setup lang="ts">
import { useMetricsBaseSectionPattern } from '~/composables/metrics/useBaseSectionPattern'
import type { StatsRow } from '~/components/dashboard/charts/base/StatsSection.vue'

const { formatCurrency, result } = useMetricsBaseSectionPattern()

const maxDrawdownDisplayDates = computed(() => {
	const from = result.value.maxDrawdownDateFrom ? new Date(result.value.maxDrawdownDateFrom) : null
	const to = result.value.maxDrawdownDateTo ? new Date(result.value.maxDrawdownDateTo) : null

	if (from && to && from > to) {
		return { start: to, end: from }
	}

	return { start: from, end: to }
})

const formatLossValue = (value: number): string => {
	if (value === 0) return formatCurrency(0)
	return formatCurrency(Math.abs(value))
}

const rows = computed<StatsRow[]>(() => [
	{ label: 'components.dashboard.losing_trades.total_loss', displayValue: formatLossValue(result.value.totalLoss), valueClass: result.value.totalLoss !== 0 ? 'loss-text' : '' },
	{ label: 'components.dashboard.losing_trades.losing_trades', value: result.value.losingTradesCount, format: 'number' },
	{ label: 'components.dashboard.losing_trades.losing_contracts', value: result.value.losingContractsCount, format: 'number' },
	{ label: 'components.dashboard.losing_trades.largest_loss', displayValue: formatLossValue(result.value.largestLoss), valueClass: result.value.largestLoss !== 0 ? 'loss-text' : '' },
	{ label: 'components.dashboard.losing_trades.avg_loss', displayValue: formatLossValue(result.value.avgLoss) },
	{ label: 'components.dashboard.losing_trades.std_dev', value: result.value.stdDevLoss, format: 'currency' },
	{ label: 'components.dashboard.losing_trades.commission', value: result.value.losingTradesCommission, format: 'currency' },
	{ label: 'components.dashboard.losing_trades.avg_loss_time', value: result.value.avgLossDuration, format: 'duration' },
	{ label: 'components.dashboard.losing_trades.longest_loss_time', value: result.value.maxLossDuration, format: 'duration' },
	{ label: 'components.dashboard.losing_trades.max_losing_streak', value: result.value.maxLosingStreak, format: 'number', valueClass: 'loss-text' },
	{ label: 'components.dashboard.losing_trades.max_drawdown', displayValue: formatLossValue(result.value.maxDrawdown), valueClass: result.value.maxDrawdown !== 0 ? 'loss-text' : '' },
	{ label: 'components.dashboard.losing_trades.max_drawdown_from', value: maxDrawdownDisplayDates.value.start, format: 'date', small: true, condition: !!maxDrawdownDisplayDates.value.start },
	{ label: 'components.dashboard.losing_trades.max_drawdown_to', value: maxDrawdownDisplayDates.value.end, format: 'date', small: true, condition: !!maxDrawdownDisplayDates.value.end },
])
</script>
