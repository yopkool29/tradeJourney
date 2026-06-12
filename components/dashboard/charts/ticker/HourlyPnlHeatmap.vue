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

const props = defineProps({
	loading: { type: Boolean },
	layoutKey: { type: Number },
})

const { displayModeNet } = useNetGrossDisplay()
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
		settings.value?.timezoneDisplay!,
		settings.value?.timezoneLocal!,
		settings.value?.timezoneUtcOffset!
	)
})

const weekdayLabels = computed(() => [
	t('common.weekdays.short.monday'),
	t('common.weekdays.short.tuesday'),
	t('common.weekdays.short.wednesday'),
	t('common.weekdays.short.thursday'),
	t('common.weekdays.short.friday'),
])

const xLabels = computed(() => Array.from({ length: 24 }, (_, i) => `${i}h`))

const heatmapDataItems = computed(() =>
	heatmapData.value.map(d => [d.hour, weekdayLabels.value[d.weekday - 1], d.pnl] as [number | string, number | string, number])
)

const maxAbsPnl = computed(() =>
	Math.max(...heatmapData.value.map(d => Math.abs(d.pnl)), 1)
)

const tooltipFormatter = (params: any) => {
	const p = Array.isArray(params) ? params[0] : params
	const hour = p.value[0]
	const weekday = p.value[1]
	const pnl = p.value[2]
	return [
		`<strong>${weekday} ${hour}:00</strong>`,
		`Avg P&L: ${formatCurrency(pnl)}`,
	].join('<br/>')
}
</script>
