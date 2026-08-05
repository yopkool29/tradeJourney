<template>
	<DashboardChartsBaseStatsSection
		:title="$t('components.dashboard.risk_ratios.title')"
		:rows="rows"
	/>
</template>

<script setup lang="ts">
import type { StatsRow } from '~/components/dashboard/charts/base/StatsSection.vue'
import { useMetricsBaseSectionPattern } from '~/composables/dashboard/useBaseSectionPattern'
import { formatNumberValue } from '~/utils/dashboard'

const { result } = useMetricsBaseSectionPattern()

const rows = computed<StatsRow[]>(() => [
	{ label: 'components.dashboard.risk_ratios.profit_factor', displayValue: formatNumberValue(result.value.profitFactor) },
	{ label: 'components.dashboard.risk_ratios.pl_ratio', displayValue: formatNumberValue(result.value.plRatio) },
	{ label: 'components.dashboard.risk_ratios.recovery_factor', displayValue: formatNumberValue(result.value.recoveryFactor) },
	{ label: 'components.dashboard.risk_ratios.sharpe_ratio', displayValue: formatNumberValue(result.value.sharpeRatio) },
	{ label: 'components.dashboard.risk_ratios.sortino_ratio', displayValue: formatNumberValue(result.value.sortinoRatio) },
	{ label: 'components.dashboard.risk_ratios.calmar_ratio', displayValue: formatNumberValue(result.value.calmarRatio) },
	{ label: 'components.dashboard.risk_ratios.sqn', displayValue: formatNumberValue(result.value.sqn), borderTop: true, condition: result.value.tradesWithRMultiple > 0 },
	{ label: 'components.dashboard.risk_ratios.ulcer_index', displayValue: formatNumberValue(result.value.ulcerIndex), borderTop: result.value.tradesWithRMultiple === 0 },
])
</script>
