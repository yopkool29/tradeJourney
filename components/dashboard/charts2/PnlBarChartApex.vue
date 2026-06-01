<template>
	<UCard class="h-full" :ui="{ header: 'p-0' }">
		<template #header>
			<div class="flex items-center gap-2 w-full">
				<span class="font-semibold">{{ $t('components.dashboard.pnl_bar_chart.title') }}</span>
				<button
					class="ml-auto px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
					:title="$t('components.dashboard.pnl_bar_chart.enlarge')"
					@click="isModalOpen = true"
				>
					<UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
				</button>
				<CommonModalChart v-model="isModalOpen" :title="$t('components.dashboard.pnl_bar_chart.enlarged_title')">
					<template #content>
						<apexchart
							ref="chartModalRef"
							:key="`pnl-chart-modal-${displayModeNet}`"
							type="bar"
							:options="modalChartOptions"
							:series="chartSeries"
							style="width: 100%; height: 100%"
						/>
					</template>
				</CommonModalChart>
			</div>
		</template>
		<div
			ref="chartContainerRef"
			class="relative w-full"
			:style="{ height: `${canvasHeight}px`, cursor: 'pointer' }"
			@click="isModalOpen = true"
		>
			<div
				v-if="loading"
				class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 z-10 rounded"
			>
				<UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
			</div>
			<apexchart
				ref="chartRef"
				:key="`pnl-chart-${displayModeNet}`"
				type="bar"
				:options="chartOptions"
				:series="chartSeries"
				style="width: 100%; height: 100%"
			/>
		</div>
	</UCard>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import { formatDateWithUserTimezone } from '~/utils/date-utils'

const props = defineProps<{
	loading?: boolean
}>()

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { locale } = useI18n()
const userStore = useUserStore()
const isModalOpen = ref(false)
const appConfig = useAppConfig()
const chartConfigOptions = appConfig.charts.options
const canvasHeight = computed(() => chartConfigOptions.canvasHeight)
const { profitColor, lossColor, breakevenColor } = useTypeColors()
const dataStore = useDataStore()
const colorMode = useColorMode()

const chartRef = ref<any>(null)
const chartModalRef = ref<any>(null)
const chartContainerRef = ref<HTMLDivElement | null>(null)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
	if (!chartContainerRef.value) return
	resizeObserver = new ResizeObserver((entries) => {
		const entry = entries[0]
		if (!entry) return
		const { width, height } = entry.contentRect
		chartRef.value?.chart?.updateOptions({
			chart: { width, height }
		}, false, false)
	})
	resizeObserver.observe(chartContainerRef.value)
})

onUnmounted(() => {
	if (resizeObserver) {
		resizeObserver.disconnect()
		resizeObserver = null
	}
})

const chartInfo = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades
	const sortedTrades = [...trades].sort((a, b) => {
		const aClose = a.closeDate ? new Date(a.closeDate).getTime() : 0
		const bClose = b.closeDate ? new Date(b.closeDate).getTime() : 0
		if (aClose !== bClose) return aClose - bClose
		const aOpen = a.openDate ? new Date(a.openDate).getTime() : 0
		const bOpen = b.openDate ? new Date(b.openDate).getTime() : 0
		if (aOpen !== bOpen) return aOpen - bOpen
		return (a.id || 0) - (b.id || 0)
	})
	const maxTrades = appConfig.charts?.options?.pnlBarChart?.maxTrades || 50
	const displayTrades = sortedTrades.slice(-maxTrades)
	const labels = displayTrades.map((_, index) => `#${index + 1}`)
	const data = displayTrades.map(trade => displayModeNet.value ? trade.netProfit : trade.profit)
	const colors = displayTrades.map(trade => {
		const value = displayModeNet.value ? trade.netProfit : trade.profit
		return value > 0 ? profitColor.value :
			value < 0 ? lossColor.value :
				breakevenColor.value
	})
	return { displayTrades, data, colors, labels }
})

const chartSeries = computed<{ name: string; data: number[] }[]>(() => [
	{
		name: 'P&L',
		data: chartInfo.value.data,
	}
])

const baseOptions = computed(() => {
	const isDark = colorMode.value === 'dark'
	return {
		chart: {
			type: 'bar' as const,
			toolbar: { show: false },
			animations: { enabled: true, speed: 200 },
			background: 'transparent',
		},
		plotOptions: {
			bar: {
				distributed: true,
				borderRadius: chartConfigOptions.borderRadius,
				borderRadiusApplication: 'end',
				columnWidth: '85%',
			},
		},
		colors: chartInfo.value.colors,
		dataLabels: { enabled: false },
		legend: { show: false },
		xaxis: {
			categories: chartInfo.value.labels,
			tickAmount: Math.min(10, chartInfo.value.labels.length),
			labels: {
				rotateAlways: true,
				style: { colors: isDark ? '#9ca3af' : '#4b5563', fontSize: '10px' },
				hideOverlappingLabels: true,
				trim: true,
				maxHeight: 40,
				offsetY: 4,
			},
			axisBorder: { show: true },
			axisTicks: { show: true },
			tooltip: { enabled: true },
			floating: false,
		},
		yaxis: {
			labels: {
				formatter: (value: number) => formatCurrency(value),
			},
		},
		grid: {
			borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
			padding: { left: 5, right: 0, bottom: 10 },
		},
		theme: {
			mode: (isDark ? 'dark' : 'light') as 'light' | 'dark',
		},
		tooltip: {
			custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
				const trade = chartInfo.value.displayTrades[dataPointIndex]
				const value = chartInfo.value.data[dataPointIndex] ?? 0
				let date = ''
				if (trade?.closeDate) {
					date = formatDateWithUserTimezone(
						trade.closeDate,
						userStore.user?.settings_object || {},
						true,
						locale.value as 'fr' | 'en' | 'us',
					)
				}
				const rows = [
					date ? `Date: ${date}` : '',
					`P&L: ${formatCurrency(value)}`,
					trade?.account_displayName ? trade.account_displayName : '',
				].filter(Boolean)
				const bg = isDark ? '#1f2937' : '#ffffff'
				const color = isDark ? '#f3f4f6' : '#111827'
				const border = isDark ? '#374151' : '#e5e7eb'
				return `<div style="background:${bg};color:${color};border:0px solid ${border};padding:8px 12px;border-radius: 1px;font-size:13px;line-height:1.5;">${rows.join('<br>')}</div>`
			},
		},
	}
})

const chartOptions = computed(() => ({
	...baseOptions.value,
	chart: { ...baseOptions.value.chart, height: canvasHeight.value },
}))

const modalChartOptions = computed(() => ({
	...baseOptions.value,
	chart: { ...baseOptions.value.chart, height: 450 },
}))
</script>

<style>
.apexcharts-tooltip {
	transition: all 0.3s ease !important;
}
</style>
