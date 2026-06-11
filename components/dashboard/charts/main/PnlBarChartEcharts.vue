<template>
	<DashboardChartsBaseEchartsCard
		:title="$t('components.dashboard.pnl_bar_chart.title')"
		:enlarged-title="$t('components.dashboard.pnl_bar_chart.enlarged_title')"
		:chart-option="chartOption"
		:canvas-height="canvasHeight"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import { formatDateWithUserTimezone } from '~/utils/date-utils'

const props = defineProps<{
	loading?: boolean
	layoutKey?: number
}>()

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { locale } = useI18n()
const userStore = useUserStore()
const dataStore = useDataStore()
const appConfig = useAppConfig()
const { canvasHeight, getBaseChartOption } = useEchartsChart()
const { profitColor, lossColor, breakevenColor, isDark } = useTypeColors()

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

const chartOption = computed(() => {
	const trades = displayTrades.value
	const values = trades.map(t => displayModeNet.value ? t.netProfit : t.profit)
	const colors = values.map(v =>
		v > 0 ? profitColor.value : v < 0 ? lossColor.value : breakevenColor.value
	)

	const base = getBaseChartOption(isDark.value)

	return {
		...base,
		grid: { left: 60, right: 16, top: 12, bottom: 28 },
		tooltip: {
			...base.tooltip,
			axisPointer: { type: 'line' as const, snap: true, lineStyle: { type: 'dashed' } },
			formatter: (params: any) => {
				const p = Array.isArray(params) ? params[0] : params
				const trade = trades[p.dataIndex]
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
			},
		},
		xAxis: {
			...base.xAxis,
			data: trades.map((_, i) => `#${i + 1}`),
		},
		yAxis: {
			...base.yAxis,
			axisLabel: {
				...base.yAxis.axisLabel,
				formatter: (v: number) => formatCurrency(v),
			},
		},
		series: [{
			type: 'bar',
			data: values.map((v, i) => ({
				value: v,
				itemStyle: {
					color: colors[i],
					borderRadius: v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3],
				},
			})),
			barMaxWidth: 32,
			emphasis: { disabled: true },
		}],
	}
})
</script>
