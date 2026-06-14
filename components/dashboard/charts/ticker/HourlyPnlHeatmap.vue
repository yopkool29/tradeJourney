<template>
	<DashboardChartsBaseHeatmapChart
		:title="$t('components.dashboard.hourly_heatmap.title')"
		:enlarged-title="$t('components.dashboard.hourly_heatmap.enlarged_title')"
		:data="heatmapDataItems"
		:x-labels="xLabels"
		:y-labels="weekdayLabels"
		:visual-map="{ min: -maxAbsPnl, max: maxAbsPnl }"
		:tooltip-formatter="tooltipFormatter"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import { calculateHourlyHeatmapData } from '~/composables/useAnalytics'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

defineProps({
	loading: { type: Boolean },
})

const { formatCurrency } = useUtils()
const { t } = useI18n()
const dataStore = useDataStore()
const userStore = useUserStore()
const settings = computed(() => userStore.user?.settings_object)

const heatmapData = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateHourlyHeatmapData(
		trades,
		settings.value!.timezoneDisplay!,
		settings.value!.timezoneLocal!,
		settings.value!.timezoneUtcOffset!
	)
})

const hasWeekendTrades = computed(() => {
	return heatmapData.value.some(d => (d.weekday === 6 || d.weekday === 7) && d.tradesCount > 0)
})

const weekdayLabels = computed(() => {
	const labels = [
		t('common.weekdays.short.monday'),
		t('common.weekdays.short.tuesday'),
		t('common.weekdays.short.wednesday'),
		t('common.weekdays.short.thursday'),
		t('common.weekdays.short.friday'),
	]
	if (hasWeekendTrades.value) {
		labels.push(t('common.weekdays.short.saturday'))
		labels.push(t('common.weekdays.short.sunday'))
	}
	return labels
})

const xLabels = computed(() => Array.from({ length: 24 }, (_, i) => `${i}h`))

const heatmapDataItems = computed(() => {
	// Filter out weekend data if no weekend trades
	const filteredData = hasWeekendTrades.value
		? heatmapData.value
		: heatmapData.value.filter(d => d.weekday <= 5)
	return filteredData.map(d => [d.hour, weekdayLabels.value[d.weekday - 1], d.pnl] as [number | string, number | string, number])
})

const maxAbsPnl = computed(() =>
	Math.max(...heatmapData.value.map(d => Math.abs(d.pnl)), 1)
)

const tooltipFormatter = (params: EChartsFormatterParams<unknown>, _labels: string[]) => {
	const [hour, weekday, pnl] = params.value as [number, string, number]
	return [
		`<strong>${weekday} ${hour}:00</strong>`,
		`Avg P&L: ${formatCurrency(pnl)}`,
	].join('<br/>')
}
</script>
