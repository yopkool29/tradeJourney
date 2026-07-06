<template>
	<DashboardChartsBaseCartesianChart
		:title="$t('components.dashboard.appt_chart.title')"
		:enlarged-title="$t('components.dashboard.appt_chart.enlarged_title')"
		:labels="labels"
		:series="series"
		:tooltip-formatter="tooltipFormatter"
		:y-axis-formatter="formatCurrency"
		:canvas-height="canvasHeight"
		:loading="loading"
		:subtitle="aggregationLabel"
	>
		<template #settings>
			<div class="space-y-2">
				<div class="flex flex-col gap-1">
					<span class="text-sm font-medium">{{ $t('components.dashboard.common.aggregation') }}</span>
					<USelect
						v-model="cumuleMode"
						:items="aggregationOptions"
						size="sm"
					/>
				</div>
			</div>
		</template>
	</DashboardChartsBaseCartesianChart>
</template>

<script setup lang="ts">
import { generateApptChartData } from '~/utils/dashboard'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

type ApptFormatterParams = EChartsFormatterParams & { axisValue?: string }
type ApptFormatter = (params: EChartsFormatterParams | ApptFormatterParams[], labels: string[]) => string

defineProps({
	loading: { type: Boolean },
})

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { t } = useI18n()
const { canvasHeight } = useEchartsChart()
const { movingAverageColor, profitColor, lossColor } = useTypeColors('apptChart')
const dataStore = useDataStore()
const dbStateStore = useDbStateStore()
const { getGroupedTrades } = useAggregationCache()

type AggregationMode = 'day' | 'week' | 'month'

const aggregationOptions = computed(() => [
	{ label: t('components.dashboard.index.by_day'), value: 'day' },
	{ label: t('components.dashboard.index.by_week'), value: 'week' },
	{ label: t('components.dashboard.index.by_month'), value: 'month' },
])

const cumuleMode = computed<AggregationMode>({
	get: () => (dbStateStore.chartSettings['appt']?.cumuleMode as AggregationMode) ?? 'week',
	set: (val: AggregationMode) => {
		dbStateStore.chartSettings['appt'] = { ...dbStateStore.chartSettings['appt'], cumuleMode: val }
	},
})

const aggregationLabel = computed(() => {
	const opt = aggregationOptions.value.find(o => o.value === cumuleMode.value)
	return opt?.label ?? ''
})

const userStore = useUserStore()

const rawData = computed(() => generateApptChartData(
	dataStore.lastTrades,
	cumuleMode.value,
	5,
	displayModeNet.value,
	userStore.settingsObject,
	getGroupedTrades(cumuleMode.value)
))

const labels = computed(() => rawData.value.labels as string[])
const maValues = computed(() => (rawData.value.datasets[0]?.data || []) as number[])
const apptValues = computed(() => (rawData.value.datasets[1]?.data || []) as number[])
const maColor = computed(() => movingAverageColor.value || '#6366f1')

const series = computed(() => [
	{
		type: 'line' as const,
		name: t('components.dashboard.index.mobile_avg_label'),
		data: maValues.value,
		color: maColor.value,
	},
	{
		type: 'bar' as const,
		name: 'APPT',
		data: apptValues.value.map((v: number) => ({
			value: v,
			itemStyle: {
				color: v >= 0 ? profitColor.value : lossColor.value,
				borderRadius: v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3],
			},
		})),
		barMaxWidth: 32,
		emphasis: { disabled: true },
	},
])

const tooltipFormatter: ApptFormatter = (params) => {
	const list = (Array.isArray(params) ? params : [params]) as ApptFormatterParams[]
	const label = list[0]?.axisValue || ''
	const lines = list.map((p: ApptFormatterParams) => {
		const val = p.value as number
		if (val === null || val === undefined) return null
		return `${p.seriesName}: ${formatCurrency(val)}`
	}).filter(Boolean)
	return [label ? `Date: ${label}` : '', ...lines].filter(Boolean).join('<br/>')
}
</script>
