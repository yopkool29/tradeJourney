<template>
	<DashboardChartsBaseCartesianChart
		:title="$t('components.dashboard.winrate_chart.title')"
		:enlarged-title="$t('components.dashboard.winrate_chart.enlarged_title')"
		:labels="labels"
		:series="series"
		:tooltip-formatter="tooltipFormatter"
		:y-axis-min="0"
		:y-axis-max="100"
		:y-axis-formatter="(v: number) => `${v}%`"
		:canvas-height="canvasHeight"
		:loading="loading"
	>
		<template #settings>
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<UCheckbox v-model="showBars" />
					<span class="text-sm">{{ $t('components.dashboard.common.show_bars') }}</span>
				</div>
				<div class="flex items-center gap-2">
					<UCheckbox v-model="showMovingAverage" />
					<span class="text-sm">{{ $t('components.dashboard.common.show_moving_average') }}</span>
				</div>
			</div>
		</template>
	</DashboardChartsBaseCartesianChart>
</template>

<script setup lang="ts">
import { generateWinrateChartData } from '~/utils/dashboard'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

type WinrateFormatterParams = EChartsFormatterParams & { axisValue?: string }
type WinrateFormatter = (params: EChartsFormatterParams | WinrateFormatterParams[], labels: string[]) => string

defineProps({
	loading: { type: Boolean },
})

const { displayModeNet } = useNetGrossDisplay()
const { t } = useI18n()
const { canvasHeight } = useEchartsChart()
const { barColor, movingAverageColor } = useTypeColors('winrateChart')
const dataStore = useDataStore()
const userStore = useUserStore()
const dbStateStore = useDbStateStore()

const showBars = computed({
	get: () => (userStore.chartSettings['winrate']?.showBars as boolean) ?? true,
	set: (val: boolean) => {
		userStore.chartSettings['winrate'] = { ...userStore.chartSettings['winrate'], showBars: val }
	},
})

const showMovingAverage = computed({
	get: () => (userStore.chartSettings['winrate']?.showMovingAverage as boolean) ?? true,
	set: (val: boolean) => {
		userStore.chartSettings['winrate'] = { ...userStore.chartSettings['winrate'], showMovingAverage: val }
	},
})

const rawData = computed(() => generateWinrateChartData(
	dataStore.lastTrades,
	dbStateStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year',
	3,
	displayModeNet.value
))

const labels = computed(() => rawData.value.labels as string[])
const maValues = computed(() => (rawData.value.datasets[0]?.data || []) as number[])
const winrateValues = computed(() => (rawData.value.datasets[1]?.data || []) as number[])
const maColor = computed(() => movingAverageColor.value || '#6366f1')
const barFill = computed(() => barColor.value || '#f472b6')

const series = computed(() => [
	...(showMovingAverage.value ? [{
		type: 'line' as const,
		name: t('components.dashboard.index.mobile_avg_label'),
		data: maValues.value,
		color: maColor.value,
	}] : []),
	...(showBars.value ? [{
		type: 'bar' as const,
		name: 'Winrate',
		data: winrateValues.value.map((v: number) => ({
			value: v,
			itemStyle: { color: barFill.value, borderRadius: [3, 3, 0, 0] },
		})),
		barMaxWidth: 32,
		emphasis: { disabled: true },
	}] : []),
])

const tooltipFormatter: WinrateFormatter = (params) => {
	const list = (Array.isArray(params) ? params : [params]) as WinrateFormatterParams[]
	const label = list[0]?.axisValue || ''
	const lines = list.map((p) => {
		const val = p.value as number
		if (val === null || val === undefined) return null
		return `${p.seriesName}: ${val.toFixed(0)}%`
	}).filter(Boolean)
	return [label ? `Date: ${label}` : '', ...lines].filter(Boolean).join('<br/>')
}
</script>
