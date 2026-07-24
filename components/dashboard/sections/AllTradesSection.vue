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
const { t } = useI18n()

const reliabilityLabel = computed(() => {
	const r = result.value.rMultipleReliability
	if (r === 'reliable') return t('components.dashboard.all_trades.reliability_reliable')
	if (r === 'partial') return t('components.dashboard.all_trades.reliability_partial')
	if (r === 'approximate') return t('components.dashboard.all_trades.reliability_approximate')
	return t('components.dashboard.all_trades.reliability_none')
})

// Affiche le label de fiabilité + le coverage (ex: "Partiel — 60% avec SL (3/5)")
const reliabilityDisplay = computed(() => {
	const label = reliabilityLabel.value
	const coverage = result.value.rMultipleCoverage
	const withSl = result.value.tradesWithStopLoss
	const total = result.value.tradesCount
	return t('components.dashboard.all_trades.reliability_coverage', {
		label,
		percent: coverage,
		withSl,
		total,
	})
})

const reliabilityClass = computed(() => {
	const r = result.value.rMultipleReliability
	if (r === 'reliable') return 'text-green-500'
	if (r === 'partial') return 'text-yellow-500'
	if (r === 'approximate') return 'text-orange-500'
	return 'text-red-500'
})

const rows = computed<StatsRow[]>(() => [
	{ label: 'components.dashboard.all_trades.gross_pnl', value: result.value.grossPnl, format: 'currency', valueClass: result.value.grossPnl >= 0 ? 'profit-text' : 'loss-text' },
	{ label: 'components.dashboard.all_trades.trades_count', value: result.value.tradesCount, format: 'number' },
	{ label: 'components.dashboard.all_trades.trade_frequency', value: result.value.tradeFrequency, format: 'decimal1' },
	{ label: 'components.dashboard.all_trades.contracts', value: result.value.totalContracts, format: 'number' },
	{ label: 'components.dashboard.all_trades.avg_trade_time', value: result.value.avgTradeDuration, format: 'duration' },
	{ label: 'components.dashboard.all_trades.longest_trade_time', value: result.value.maxTradeDuration, format: 'duration' },
	{ label: 'components.dashboard.all_trades.winrate', value: result.value.winrate, format: 'percent' },
	{ label: 'components.dashboard.all_trades.expectancy', value: result.value.expectancy, format: 'currency', valueClass: result.value.expectancy >= 0 ? 'profit-text' : 'loss-text' },
	{ label: 'components.dashboard.all_trades.commission', value: result.value.totalCommission, format: 'currency' },
	{ label: 'components.dashboard.all_trades.total_pnl', value: result.value.pnl, format: 'currency', valueClass: result.value.pnl >= 0 ? 'profit-text' : 'loss-text', borderTop: true },
	// R-multiple metrics (affichés seulement si au moins un trade a un R calculable)
	{ label: 'components.dashboard.all_trades.total_r', value: result.value.totalR, format: 'rMultiple', valueClass: rValueClass(result.value.totalR), borderTop: true, condition: result.value.tradesWithRMultiple > 0 },
	{ label: 'components.dashboard.all_trades.appt_r', value: result.value.apptR, format: 'rMultiple', valueClass: rValueClass(result.value.apptR), condition: result.value.tradesWithRMultiple > 0 },
	// Indicateur de fiabilité du R-multiple (label coloré + coverage)
	{ label: 'components.dashboard.all_trades.reliability_label', displayValue: reliabilityDisplay.value, valueClass: reliabilityClass.value, condition: result.value.tradesWithRMultiple > 0 },
])

const rValueClass = (r: number | null): string => {
	if (r === null || r === undefined) return ''
	return r >= 0 ? 'profit-text' : 'loss-text'
}
</script>
