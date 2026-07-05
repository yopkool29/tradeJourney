<template>
	<UCard class="h-full" :ui="{ header: 'p-0' }">
		<template #header>
			<div class="flex items-center gap-2 w-full">
				<span class="font-semibold">{{ $t('components.dashboard.cumulated_pnl_chart.title') }}</span>
				<button
					class="ml-auto px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
					:title="$t('components.dashboard.cumulated_pnl_chart.enlarge')"
					@click="isModalOpen = true"
				>
					<UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
				</button>
				<CommonModalChart v-model="isModalOpen" :title="$t('components.dashboard.cumulated_pnl_chart.enlarged_title')">
					<template #content>
						<div style="width: 100%; height: 100%; cursor: crosshair">
							<apexchart
								ref="chartModalRef"
								:key="`cumulated-chart-modal-${displayModeNet}-${colorMode.value}`"
								type="area"
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
				:key="`cumulated-chart-${displayModeNet}-${colorMode.value}`"
				type="area"
				:options="chartOptions"
				:series="chartSeries"
				width="100%"
				:height="canvasHeight"
			/>
		</div>
	</UCard>
</template>

<script setup lang="ts">
import type { TradeType } from '~/schema/trade'
import { generateCumulatedPnlChartData } from '~/utils/dashboard'

const props = defineProps<{
	startingCapital?: number | null
	loading?: boolean
}>()

const { formatCurrency } = useUtils()
const { locale } = useI18n()
const userStore = useUserStore()
const dataStore = useDataStore()
const { displayModeNet } = useNetGrossDisplay()
const isModalOpen = ref(false)
const appConfig = useAppConfig()
const chartConfigOptions = appConfig.charts.options
const canvasHeight = computed(() => chartConfigOptions.canvasHeight)
const { profitColor, lossColor } = useTypeColors('cumulatedPnlChart')
const colorMode = useColorMode()
const isDarkMode = useIsDark()

const chartModalRef = ref<any>(null)

const chartInfo = computed(() => {
	const raw = generateCumulatedPnlChartData(
		dataStore.lastTrades as TradeType[],
		userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year',
		displayModeNet.value,
		userStore.user?.settings_object ?? null
	)

	let labels: string[] = raw.labels || []
	let values: number[] = []

	if (raw.datasets && raw.datasets.length > 0) {
		const dataset = raw.datasets[0]
		values = dataset.data as number[]
	}

	// Si capital de départ, ajouter un point initial
	if (props.startingCapital && props.startingCapital > 0) {
		values = [props.startingCapital, ...values.map(v => v + props.startingCapital!)]
		labels = ['', ...labels]
	}

	return { labels, values }
})

const chartSeries = computed(() => [
	{
		name: 'Cumulé',
		data: chartInfo.value.values,
	},
])

const threshold = computed(() => props.startingCapital ?? 0)

const baseOptions = computed(() => {
	const isDark = isDarkMode.value
	const color = profitColor.value || '#22c55e'
	return {
		chart: {
			type: 'area' as const,
			toolbar: { show: false },
			animations: { enabled: true, speed: 200 },
			background: 'transparent',
			redrawOnParentResize: true,
			redrawOnWindowResize: true,
			zoom: { enabled: false },
			panning: { enabled: false },
		},
		stroke: {
			curve: 'smooth' as const,
			width: 2,
			colors: [color],
		},
		fill: {
			type: 'gradient' as const,
			colors: [color],
		},
		colors: [color],
		markers: { size: 0, hover: { size: 0 } },
		dataLabels: { enabled: false },
		legend: { show: false },
		xaxis: {
			categories: chartInfo.value.labels,
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
		yaxis: {
			labels: {
				formatter: (value: number) => formatCurrency(value),
			},
		},
		grid: {
			borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
			padding: { top: -10, left: 5, right: 0, bottom: 0 },
		},
		theme: {
			mode: (isDark ? 'dark' : 'light') as 'light' | 'dark',
		},
		tooltip: {
			theme: isDark ? 'dark' : 'light',
			followCursor: true,
			style: {
				background: isDark ? '#1f2937' : '#ffffff',
				fontSize: '13px',
			},
			custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
				const label = chartInfo.value.labels[dataPointIndex] ?? ''
				const value = chartInfo.value.values[dataPointIndex] ?? 0
				const rows = [
					label ? `Date: ${label}` : '',
					`Cumulé: ${formatCurrency(value)}`,
				].filter(Boolean)
				return `<div style="padding:8px 12px;line-height:1.6;"><div style="font-weight:600;margin-bottom:2px;">#${dataPointIndex + 1}</div>${rows.join('<br>')}</div>`
			},
		},
		annotations: threshold.value !== 0 ? {
			yaxis: [
				{
					y: threshold.value,
					strokeDashArray: 4,
					borderColor: isDark ? '#6b7280' : '#9ca3af',
					label: {
						style: { color: isDark ? '#e5e7eb' : '#374151' },
						text: '',
					},
				},
			],
		} : undefined,
	}
})

const chartOptions = computed(() => ({
	...baseOptions.value,
}))

const modalChartOptions = computed(() => ({
	...baseOptions.value,
}))
</script>

<style>
.apexcharts-tooltip {
	transition: all 0.3s ease !important;
}
</style>
