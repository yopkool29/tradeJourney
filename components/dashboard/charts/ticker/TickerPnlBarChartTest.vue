<template>
	<div class="h-full overflow-y-auto bg-surface rounded-lg">
		<div class="flex items-center justify-between px-3 py-2 border-b border-default">
			<span class="font-semibold">{{ $t('components.dashboard.ticker_pnl_chart.title') }}</span>
			<button
				class="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
				:title="$t('components.dashboard.ticker_pnl_chart.enlarged_title')"
				@click="isModalOpen = true"
			>
				<UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
			</button>
		</div>
		<div class="p-2">
			<VChart :option="chartOption" autoresize style="width: 100%; height: 600px;" />
		</div>
		<CommonModalScrollableChart
			v-model="isModalOpen"
			:title="$t('components.dashboard.ticker_pnl_chart.enlarged_title')"
			:chart-option="chartOption"
		/>
	</div>
</template>

<script setup lang="ts">
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

defineProps<{
	loading?: boolean
	layoutKey?: number
}>()

const isModalOpen = ref(false)

const { formatCurrency } = useUtils()
const { getBaseChartOption } = useEchartsChart()
const { profitColor, lossColor, breakevenColor, isDark } = useTypeColors()
const appConfig = useAppConfig()

// Generate 40 fake tickers
const generateFakeTickers = () => {
	const symbols = [
		'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'JNJ', 'V',
		'PG', 'UNH', 'HD', 'MA', 'BAC', 'ABBV', 'PFE', 'KO', 'PEP', 'LLY',
		'COST', 'TMO', 'AVGO', 'DIS', 'ABT', 'ACN', 'WMT', 'MRK', 'NKE', 'XOM',
		'CRM', 'ADBE', 'TXN', 'VZ', 'CVX', 'NFLX', 'QCOM', 'BMY', 'PM', 'RTX'
	]
	
	return symbols.map((symbol, i) => {
		// Mix of profit and loss
		const isProfit = Math.random() > 0.4
		const baseAmount = Math.random() * 3000
		const pnl = isProfit ? baseAmount : -baseAmount * 0.8
		
		return {
			symbol,
			pnl,
			tradesCount: Math.floor(Math.random() * 50) + 1,
			winrate: Math.random() * 60 + 20,
			profitFactor: Math.random() * 3 + 0.5,
			avgWin: pnl > 0 ? pnl / (Math.floor(Math.random() * 20) + 1) : 0,
			avgLoss: pnl < 0 ? Math.abs(pnl) / (Math.floor(Math.random() * 20) + 1) : 0,
		}
	})
}

const tickerMetrics = computed(() => {
	const metrics = generateFakeTickers()
	// Sort by PNL descending
	return metrics.sort((a, b) => b.pnl - a.pnl)
})

const chartOption = computed(() => {
	const metrics = tickerMetrics.value.slice(0, appConfig.charts?.options?.tickerChart?.maxTickers || 20)
	const values = metrics.map(m => m.pnl)
	const symbols = metrics.map(m => m.symbol)
	const colors = values.map(v =>
		v > 0 ? profitColor.value : v < 0 ? lossColor.value : breakevenColor.value
	)

	const base = getBaseChartOption(isDark.value)

	return {
		...base,
		grid: { left: 80, right: 80, top: 12, bottom: 28 },
		tooltip: {
			...base.tooltip,
			formatter: (params: unknown) => {
				const p = Array.isArray(params) ? (params as EChartsFormatterParams[])[0] : params as EChartsFormatterParams
				const metric = metrics[p.dataIndex]
				const lines = [
					`<strong>${metric.symbol}</strong>`,
					`P&L: ${formatCurrency(metric.pnl)}`,
					`Trades: ${metric.tradesCount}`,
					`Winrate: ${metric.winrate.toFixed(1)}%`,
					`Profit Factor: ${metric.profitFactor.toFixed(2)}`,
					`Avg Win: ${formatCurrency(metric.avgWin)}`,
					`Avg Loss: ${formatCurrency(metric.avgLoss)}`,
				].filter(Boolean)
				return lines.join('<br/>')
			},
		},
		xAxis: {
			type: 'value' as const,
			axisLabel: {
				formatter: (v: number) => formatCurrency(v),
			},
			splitLine: {
				lineStyle: {
					type: 'dashed' as const,
					opacity: 0.3,
				},
			},
		},
		yAxis: {
			type: 'category' as const,
			data: symbols,
			axisLabel: {
				overflow: 'truncate' as const,
				width: 70,
			},
			inverse: true,
		},
		series: [{
			type: 'bar' as const,
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
				formatter: (params: unknown) => formatCurrency((params as EChartsFormatterParams).value as number),
				fontSize: 12,
				textBorderColor: 'transparent',
				textBorderWidth: 0,
			},
		}],
	}
})
</script>
