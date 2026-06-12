<template>
	<div class="h-full overflow-y-auto">
		<UCard class="h-full flex flex-col" :ui="{ header: 'p-0 flex-shrink-0', body: 'flex-1 flex flex-col min-h-0 p-2' }">
			<template #header>
				<div class="flex items-center gap-2 w-full px-2 py-1">
					<span class="font-semibold">{{ $t('components.dashboard.ticker_pnl_chart.title') }}</span>
					<button
						class="ml-auto px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
						:title="$t('components.dashboard.ticker_pnl_chart.enlarged_title')"
						@click="isModalOpen = true"
					>
						<UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
					</button>
					<CommonModalChart
						v-model="isModalOpen"
						:title="$t('components.dashboard.ticker_pnl_chart.enlarged_title')"
					>
						<template #content>
							<VChart :option="chartOption" autoresize style="width: 100%; height: 100%;" />
						</template>
					</CommonModalChart>
				</div>
			</template>
			<VChart :option="chartOption" autoresize style="width: 100%; height: 600px;" />
		</UCard>
	</div>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import { getEchartsAxisColors } from '~/utils/chart-utils'

const props = defineProps<{
	loading?: boolean
	layoutKey?: number
}>()

const isModalOpen = ref(false)

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { locale, t } = useI18n()
const userStore = useUserStore()
const dataStore = useDataStore()
const appConfig = useAppConfig()
const { getBaseChartOption } = useEchartsChart()
const { profitColor, lossColor, breakevenColor, isDark } = useTypeColors()
const { calculateMetricsByTicker } = useAnalytics()

const tickerMetrics = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByTicker(trades, displayModeNet.value)
})

const chartOption = computed(() => {
	const metrics = tickerMetrics.value
	const values = metrics.map(m => m.pnl)
	const symbols = metrics.map(m => m.symbol)
	const colors = values.map(v =>
		v > 0 ? profitColor.value : v < 0 ? lossColor.value : breakevenColor.value
	)

	const base = getBaseChartOption(isDark.value)
	const { axisColor, textColor } = getEchartsAxisColors(isDark.value)

	return {
		...base,
		grid: { left: 80, right: 80, top: 12, bottom: 28 },
		tooltip: {
			...base.tooltip,
			formatter: (params: any) => {
				const p = Array.isArray(params) ? params[0] : params
				const metric = metrics[p.dataIndex]
				const lines = [
					`<strong>${metric.symbol}</strong>`,
					`${t('components.dashboard.ticker_table.pnl')}: ${formatCurrency(metric.pnl)}`,
					`${t('components.dashboard.ticker_table.trades')}: ${metric.tradesCount}`,
					`${t('components.dashboard.ticker_table.winrate')}: ${metric.winrate.toFixed(1)}%`,
					`${t('components.dashboard.ticker_table.profit_factor')}: ${metric.profitFactor === Infinity ? '∞' : metric.profitFactor.toFixed(2)}`,
					`${t('components.dashboard.ticker_table.avg_win')}: ${formatCurrency(metric.avgWin)}`,
					`${t('components.dashboard.ticker_table.avg_loss')}: ${formatCurrency(metric.avgLoss)}`,
				].filter(Boolean)
				return lines.join('<br/>')
			},
		},
		xAxis: {
			type: 'value' as const,
			axisLine: { lineStyle: { color: axisColor } },
			axisLabel: {
				color: textColor,
				formatter: (v: number) => formatCurrency(v),
			},
			splitLine: {
				lineStyle: {
					type: 'dashed' as const,
					color: axisColor,
					opacity: 0.3,
				},
			},
		},
		yAxis: {
			type: 'category' as const,
			data: symbols,
			axisLine: { lineStyle: { color: axisColor } },
			axisLabel: {
				color: textColor,
				overflow: 'truncate' as const,
				width: 70,
			},
			inverse: true,
		},
		series: [{
			type: 'bar',
			data: values.map((v, i) => ({
				value: v,
				itemStyle: {
					color: colors[i],
					borderRadius: v >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3],
				},
			})),
			barMaxWidth: 24,
			emphasis: { disabled: true },
			label: {
				show: true,
				position: 'right',
				formatter: (params: any) => formatCurrency(params.value),
				fontSize: 12,
				color: textColor,
				textBorderColor: 'transparent',
				textBorderWidth: 0,
			},
		}],
		dataZoom: [{
			type: 'inside',
			yAxisIndex: 0,
			zoomOnMouseWheel: false,
			moveOnMouseWheel: true,
		}],
	}
})
</script>
