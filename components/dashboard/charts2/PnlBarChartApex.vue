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
						<div style="width: 100%; height: 100%; cursor:crosshair">
							<apexchart
								ref="chartModalRef"
								:key="`pnl-chart-modal-${displayModeNet}-${colorMode.value}`"
								type="bar"
								:options="modalChartOptions"
								:series="chartSeries"
								width="100%"
								height="100%"
							/>
						</div>
					</template>
				</CommonModalChart>
			</div>
		</template>
		<div
			class="relative w-full overflow-hidden"
			:style="{ height: `${canvasHeight}px`, cursor: 'crosshair' }"
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
				:key="`pnl-chart-${displayModeNet}-${colorMode.value}`"
				type="bar"
				:options="chartOptions"
				:series="chartSeries"
				width="100%"
				:height="canvasHeight"
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
const isDarkMode = useIsDark()

const chartModalRef = ref<any>(null)

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
	const data = displayTrades.map((trade, index) => {
		const value = displayModeNet.value ? trade.netProfit : trade.profit
		const color = value > 0 ? profitColor.value :
			value < 0 ? lossColor.value :
				breakevenColor.value
		return {
			x: labels[index],
			y: value,
			fillColor: color,
		}
	})
	return { displayTrades, data, labels }
})

const chartSeries = computed<{ name: string; data: any[] }[]>(() => [
	{
		name: 'P&L',
		data: chartInfo.value.data,
	}
])

const baseOptions = computed(() => {
	const isDark = isDarkMode.value
	return {
		chart: {
			type: 'bar' as const,
			toolbar: { show: false },
			animations: { enabled: true, speed: 50 },
			background: 'transparent',
			redrawOnParentResize: true,
			redrawOnWindowResize: true,
			zoom: { enabled: false },
			panning: { enabled: false },
		},
		plotOptions: {
			bar: {
				borderRadius: chartConfigOptions.borderRadius,
				borderRadiusApplication: 'end',
				columnWidth: '85%',
			},
		},
		dataLabels: { enabled: false },
		legend: { show: false },
		xaxis: {
			tickAmount: Math.min(10, chartInfo.value.labels.length),
			labels: {
				rotateAlways: true,
				style: { colors: isDark ? '#9ca3af' : '#4b5563', fontSize: '10px' },
				hideOverlappingLabels: true,
				trim: false,
				maxHeight: 28,
				offsetY: 2,
			},
			axisBorder: { show: true },
			axisTicks: { show: false },
			tooltip: { enabled: true },
			floating: false,
		},
		yaxis: (() => {
			const values = chartInfo.value.data.map(d => d.y)
			const dataMin = values.length > 0 ? Math.min(...values) : 0
			const dataMax = values.length > 0 ? Math.max(...values) : 0
			const range = Math.abs(dataMax - dataMin) || 1
			const magnitude = Math.pow(10, Math.floor(Math.log10(range)))
			const step = magnitude >= 100 ? 100 : magnitude >= 10 ? 10 : 5
			const yMin = dataMin < 0 ? Math.floor((dataMin * 1.05) / step) * step : 0
			const yMax = dataMax > 0 ? Math.ceil((dataMax * 1.05) / step) * step : 0
			return {
				min: yMin,
				max: yMax,
				forceNiceScale: false,
				tickAmount: 5,
				labels: {
					formatter: (value: number) => formatCurrency(value),
				},
			}
		})(),
		grid: {
			borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
			padding: { top: -10, left: 5, right: 0, bottom: 0 },
		},
		theme: {
			mode: (isDark ? 'dark' : 'light') as 'light' | 'dark',
		},
		tooltip: {
			theme: isDark ? 'dark' : 'light',
			style: {
				background: isDark ? '#1f2937' : '#ffffff',
				fontSize: '13px',
			},
			custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
				const trade = chartInfo.value.displayTrades[dataPointIndex]
				const point = chartInfo.value.data[dataPointIndex]
				const value = point?.y ?? 0
				const label = chartInfo.value.labels[dataPointIndex] ?? ''
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
				return `<div style="padding:8px 12px;font-size:13px;line-height:1.6;"><div style="font-weight:600;margin-bottom:2px;">${label}</div>${rows.join('<br>')}</div>`
			},
		},
	}
})

const chartOptions = computed(() => ({
	...baseOptions.value,
}))

const modalChartOptions = computed(() => ({
	...baseOptions.value,
}))
</script>
