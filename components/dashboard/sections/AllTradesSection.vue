<template>
	<DashboardChartsBaseStatsSection
		:title="$t('components.dashboard.all_trades.title')"
		:rows="rows"
	/>
</template>

<script setup lang="ts">
import type { StatsRow } from '~/components/dashboard/charts/base/StatsSection.vue'
import { useMetricsBaseSectionPattern } from '~/composables/metrics/useBaseSectionPattern'

const { result } = useMetricsBaseSectionPattern()

const rows = computed<StatsRow[]>(() => [
	{ label: 'components.dashboard.all_trades.gross_pnl', value: result.value.grossPnl, format: 'currency', valueClass: result.value.grossPnl >= 0 ? 'profit-text' : 'loss-text' },
	{ label: 'components.dashboard.all_trades.trades_count', value: result.value.tradesCount, format: 'number' },
	{ label: 'components.dashboard.all_trades.contracts', value: result.value.totalContracts, format: 'number' },
	{ label: 'components.dashboard.all_trades.avg_trade_time', value: result.value.avgTradeDuration, format: 'duration' },
	{ label: 'components.dashboard.all_trades.longest_trade_time', value: result.value.maxTradeDuration, format: 'duration' },
	{ label: 'components.dashboard.all_trades.winrate', value: result.value.winrate, format: 'percent' },
	{ label: 'components.dashboard.all_trades.expectancy', value: result.value.expectancy, format: 'currency', valueClass: result.value.expectancy >= 0 ? 'profit-text' : 'loss-text' },
	{ label: 'components.dashboard.all_trades.commission', value: result.value.totalCommission, format: 'currency' },
	{ label: 'components.dashboard.all_trades.total_pnl', value: result.value.pnl, format: 'currency', valueClass: result.value.pnl >= 0 ? 'profit-text' : 'loss-text', borderTop: true },
])
</script>
