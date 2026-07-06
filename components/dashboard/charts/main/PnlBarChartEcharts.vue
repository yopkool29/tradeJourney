<template>
	<DashboardChartsBaseCartesianChart
		:title="$t('components.dashboard.pnl_bar_chart.title')"
		:enlarged-title="$t('components.dashboard.pnl_bar_chart.enlarged_title')"
		:labels="labels"
		:series="series"
		:tooltip-formatter="tooltipFormatter"
		:y-axis-formatter="formatCurrency"
		:canvas-height="canvasHeight"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import { formatDateWithUserTimezone } from '~/utils/date-utils'
import { buildBarColors, buildBarData, buildBarSeries } from '~/utils/echarts-builders'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

defineProps({
	loading: { type: Boolean },
})

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { canvasHeight } = useEchartsChart()
const { profitColor, lossColor, breakevenColor } = useTypeColors()
const { locale } = useI18n()
const dataStore = useDataStore()
const userStore = useUserStore()
const appConfig = useAppConfig() as { charts?: { options?: { pnlBarChart?: { maxTrades?: number } } } }

const displayTrades = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades
	const sorted = [...trades].sort((a, b) => {
		const aClose = a.closeDate ? new Date(a.closeDate).getTime() : 0
		const bClose = b.closeDate ? new Date(b.closeDate).getTime() : 0
		if (aClose !== bClose) return aClose - bClose
		const aOpen = a.openDate ? new Date(a.openDate).getTime() : 0
		const bOpen = b.openDate ? new Date(b.openDate).getTime() : 0
		if (aOpen !== bOpen) return aOpen - bOpen
		return (a.id || 0) - (b.id || 0)
	})
	return sorted.slice(-(appConfig.charts?.options?.pnlBarChart?.maxTrades || 50))
})

const labels = computed(() => displayTrades.value.map((_, i) => `#${i + 1}`))
const values = computed(() => displayTrades.value.map(t => displayModeNet.value ? t.netProfit : t.profit))
const colors = computed(() => buildBarColors(values.value, profitColor.value, lossColor.value, breakevenColor.value))

const series = computed(() => {
	const s = buildBarSeries({
		data: buildBarData(values.value, colors.value, v => v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3]),
		barMaxWidth: 32,
		emphasis: { disabled: true },
	})
	return (Array.isArray(s) ? s : [s]) as unknown as never[]
})

const tooltipFormatter = (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
	const p = Array.isArray(params) ? params[0] : params
	const trade = displayTrades.value[p.dataIndex]
	const value = p.value as number
	let date = ''
	if (trade?.closeDate) {
		date = formatDateWithUserTimezone(
			trade.closeDate,
			userStore.user?.settings_object || {},
			true,
			locale.value as 'fr' | 'en' | 'us'
		)
	}
	const lines = [
		date ? `Date: ${date}` : '',
		`P&L: ${formatCurrency(value)}`,
		trade?.account_displayName || '',
	].filter(Boolean)
	return lines.join('<br/>')
}
</script>
