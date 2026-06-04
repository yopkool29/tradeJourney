<template>
	<DashboardChartsBaseEchartsCard
		:title="$t('components.dashboard.cumulated_pnl_chart.title')"
		:enlarged-title="$t('components.dashboard.cumulated_pnl_chart.enlarged_title')"
		:chart-option="chartOption"
		:canvas-height="canvasHeight"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import { generateCumulatedPnlChartData } from '~/utils/dashboard'
import { colorToRgba } from '~/utils/color-utils'

const props = defineProps<{
	startingCapital?: number | null
	loading?: boolean
	layoutKey?: number
}>()

const { formatCurrency } = useUtils()
const { t } = useI18n()
const userStore = useUserStore()
const dataStore = useDataStore()
const { displayModeNet } = useNetGrossDisplay()
const { canvasHeight, getBaseChartOption } = useEchartsChart()
const { profitColor, lossColor, isDark } = useTypeColors('cumulatedPnlChart')

const chartOption = computed(() => {
	const raw = generateCumulatedPnlChartData(
		dataStore.lastTrades,
		userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year',
		displayModeNet.value
	)

	const cumulatedDataset = raw.datasets[0]

	let labels = raw.labels as string[]
	let cumulatedValues = (cumulatedDataset?.data || []) as number[]

	if (props.startingCapital && props.startingCapital > 0) {
		labels = ['', ...labels]
		cumulatedValues = [props.startingCapital, ...cumulatedValues.map(v => v + props.startingCapital!)]
	}

	const threshold = props.startingCapital ?? 0
	const base = getBaseChartOption(isDark.value)
	const { axisColor, textColor } = getEchartsAxisColors(isDark.value)

	const pColor = profitColor.value
	const lColor = lossColor.value
	const pAreaColor = colorToRgba(pColor, 0.3)
	const lAreaColor = colorToRgba(lColor, 0.3)

	type DataPoint = { value: [number, number] } | null

	const profitData: DataPoint[] = []
	const lossData: DataPoint[] = []

	for (let i = 0; i < cumulatedValues.length; i++) {
		const v = cumulatedValues[i]
		const prev = i > 0 ? cumulatedValues[i - 1] : undefined

		if (prev !== undefined) {
			const crossedUp = prev < threshold && v >= threshold
			const crossedDown = prev >= threshold && v < threshold

			if (crossedUp || crossedDown) {
				const t = (threshold - prev) / (v - prev)
				const xi = (i - 1) + t
				const crossing = { value: [xi, threshold] as [number, number] }
				profitData.push(crossing)
				lossData.push(crossing)
			}
		}

		const point = { value: [i, v] as [number, number] }
		if (v >= threshold) {
			profitData.push(point)
			lossData.push(null)
		} else {
			lossData.push(point)
			profitData.push(null)
		}
	}

	const seriesBase = {
		type: 'line' as const,
		smooth: false,
		symbol: 'none',
		connectNulls: false,
		emphasis: { disabled: true },
		blur: { lineStyle: { opacity: 1 }, areaStyle: { opacity: 0.3 } },
	}

	return {
		...base,
		tooltip: {
			...base.tooltip,
			formatter: (params: any) => {
				const p = params.find((x: any) => x.value !== null)
				if (!p) return ''
				const xi = Math.round(p.value[0])
				const label = labels[xi] || ''
				const val = p.value[1] as number
				return [label ? `Date: ${label}` : '', `${t('components.dashboard.index.cumulated_label')}: ${formatCurrency(val)}`].filter(Boolean).join('<br/>')
			},
		},
		xAxis: {
			type: 'value' as const,
			min: 0,
			max: labels.length - 1,
			boundaryGap: false,
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: {
				color: textColor,
				fontSize: 11,
				formatter: (v: number) => labels[Math.round(v)] ?? '',
			},
			splitLine: { show: false },
		},
		yAxis: {
			...base.yAxis,
			scale: true,
			axisLabel: {
				color: textColor,
				fontSize: 11,
				formatter: (v: number) => formatCurrency(v),
			},
		},
		series: [
			{
				...seriesBase,
				name: t('components.dashboard.index.cumulated_label'),
				data: profitData,
				lineStyle: { width: 2, color: pColor },
				itemStyle: { color: pColor },
				areaStyle: { origin: 'start', color: pAreaColor },
			},
			{
				...seriesBase,
				name: t('components.dashboard.index.cumulated_label'),
				data: lossData,
				lineStyle: { width: 2, color: lColor },
				itemStyle: { color: lColor },
				areaStyle: { origin: 'start', color: lAreaColor },
				markLine: threshold > 0 ? {
					silent: true,
					symbol: 'none',
					lineStyle: { color: axisColor, type: 'dashed', width: 1 },
					data: [{ yAxis: threshold }],
					label: { show: false },
				} : undefined,
			},
		],
	}
})
</script>
