<template>
	<DashboardChartsBaseCartesianChart
		:title="$t('components.dashboard.hourly_winrate.title')"
		:enlarged-title="$t('components.dashboard.hourly_winrate.enlarged_title')"
		:labels="labels"
		:series="series"
		:tooltip-formatter="tooltipFormatter"
		:y-axis-min="0"
		:y-axis-max="100"
		:y-axis-formatter="(v: number) => `${v}%`"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import { calculateMetricsByHour } from '~/composables/useAnalytics'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

defineProps({
	loading: { type: Boolean },
})

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { t } = useI18n()
const { profitColor, lossColor, breakevenColor } = useTypeColors()
const isDark = useIsDark()
const dataStore = useDataStore()
const userStore = useUserStore()
const settings = computed(() => userStore.user?.settings_object)

const hourlyMetrics = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByHour(
		trades,
		displayModeNet.value,
		settings.value?.timezoneDisplay ?? '',
		settings.value?.timezoneLocal ?? '',
		settings.value?.timezoneUtcOffset ?? 0
	)
})

const labels = computed(() => hourlyMetrics.value.map(m => `${m.hour}h`))
const winrates = computed(() => hourlyMetrics.value.map(m => m.winrate))
const tradesCounts = computed(() => hourlyMetrics.value.map(m => m.tradesCount))

const series = computed(() => [{
	type: 'bar' as const,
	name: 'Winrate',
	data: winrates.value.map((w, i) => ({
		value: w,
		itemStyle: {
			color: tradesCounts.value[i] > 0
				? (w >= 50 ? profitColor.value : lossColor.value)
				: breakevenColor.value,
			borderRadius: [3, 3, 0, 0],
		},
	})),
	barMaxWidth: 24,
	emphasis: {
		itemStyle: {
			borderColor: isDark.value ? '#ffffff' : '#1f2937',
			borderWidth: 2,
		},
	},
}])

const tooltipFormatter = (params: EChartsFormatterParams, _labels: string[]) => {
	const hour = params.dataIndex
	const m = hourlyMetrics.value[hour]
	return [
		`<strong>${m.hour}:00</strong>`,
		`${t('components.dashboard.index.win_rate')}: ${m.winrate.toFixed(1)}%`,
		`${t('components.dashboard.ticker_table.trades')}: ${m.tradesCount}`,
		`${t('components.dashboard.ticker_table.pnl')}: ${formatCurrency(m.pnl)}`,
	].join('<br/>')
}
</script>
