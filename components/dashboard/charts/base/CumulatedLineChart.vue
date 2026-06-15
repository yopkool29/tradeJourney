<template>
	<DashboardChartsBaseEchartsCard
		:title="title"
		:enlarged-title="enlargedTitle"
		:chart-option="chartOption"
		:canvas-height="canvasHeight"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { getEchartsBaseOption, getEchartsAxisColors, getEchartsTooltipColors } from '~/utils/chart-utils'
import { colorToRgba } from '~/utils/color-utils'
import type { EChartsFormatterParams, EChartsAreaStyle } from '~/utils/echarts-builders'

type DataPoint = { value: [number, number]; itemStyle?: { opacity: number }; symbolSize?: number } | null

const props = defineProps({
	title: { type: String, required: true },
	enlargedTitle: { type: String, required: true },
	labels: { type: Array as PropType<string[]>, required: true },
	values: { type: Array as PropType<number[]>, required: true },
	threshold: { type: Number, default: 0 },
	profitColor: { type: String, default: '#10b981' },
	lossColor: { type: String, default: '#ef4444' },
	yAxisFormatter: { type: Function as PropType<(v: number) => string>, default: undefined },
	tooltipFormatter: { type: Function as PropType<(params: EChartsFormatterParams<number | [number, number]>[], labels: string[]) => string>, default: undefined },
	loading: { type: Boolean, default: false },
	canvasHeight: { type: Number, default: undefined },
})

const isDark = useIsDark()

const chartOption = computed((): EChartsOption => {
	const { axisColor, textColor } = getEchartsAxisColors(isDark.value)
	const { backgroundColor, borderColor, textColor: tooltipTextColor } = getEchartsTooltipColors()
	const pColor = props.profitColor
	const lColor = props.lossColor
	const pAreaColor = colorToRgba(pColor, 0.3)
	const lAreaColor = colorToRgba(lColor, 0.3)
	const threshold = props.threshold

	const profitData: DataPoint[] = []
	const lossData: DataPoint[] = []

	for (let i = 0; i < props.values.length; i++) {
		const v = props.values[i]
		const prev = i > 0 ? props.values[i - 1] : undefined

		if (prev !== undefined) {
			const crossedUp = prev < threshold && v >= threshold
			const crossedDown = prev >= threshold && v < threshold

			if (crossedUp || crossedDown) {
				const tRatio = (threshold - prev) / (v - prev)
				const xi = (i - 1) + tRatio
				const crossingPoint = { value: [xi, threshold] as [number, number], itemStyle: { opacity: 0 }, symbolSize: 0 }
				profitData.push(crossingPoint)
				lossData.push(crossingPoint)
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

	const largeDataset = props.values.length > 500

	const seriesBase = {
		type: 'line' as const,
		smooth: false,
		symbol: 'none',
		showSymbol: false,
		symbolSize: 0,
		connectNulls: false,
		emphasis: { disabled: true },
		blur: { lineStyle: { opacity: 1 }, areaStyle: { opacity: 0.3 } },
		...(largeDataset && { sampling: 'lttb' as const, progressive: 500, progressiveThreshold: 500 }),
	}

	return {
		...getEchartsBaseOption(),
		animation: false,
		grid: { left: 70, right: 16, top: 12, bottom: 28 },
		dataZoom: [],
		tooltip: {
			trigger: 'axis' as const,
			backgroundColor,
			borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: 'parent',
			className: 'echarts-custom-tooltip',
			axisPointer: { snap: true },
			...(props.tooltipFormatter && { formatter: (params: unknown) => props.tooltipFormatter!(params as EChartsFormatterParams<number | [number, number]>[], props.labels) }),
		} as EChartsOption['tooltip'],
		xAxis: {
			type: 'value' as const,
			min: 0,
			max: props.labels.length - 1,
			boundaryGap: [0, 0] as [number, number],
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: {
				color: textColor,
				fontSize: 11,
				formatter: (v: number) => props.labels[Math.round(v)] ?? '',
			},
			splitLine: { show: false },
		},
		yAxis: {
			type: 'value' as const,
			scale: true,
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: {
				color: textColor,
				fontSize: 11,
				...(props.yAxisFormatter && { formatter: (v: number) => props.yAxisFormatter!(v) }),
			},
			splitLine: { lineStyle: { color: axisColor } },
		},
		series: [
			{
				...seriesBase,
				name: 'Cumulated',
				data: profitData,
				lineStyle: { width: 2, color: pColor },
				itemStyle: { color: pColor },
				areaStyle: { origin: threshold, color: pAreaColor } as EChartsAreaStyle,
			},
			{
				...seriesBase,
				name: 'Cumulated',
				data: lossData,
				lineStyle: { width: 2, color: lColor },
				itemStyle: { color: lColor },
				areaStyle: { origin: threshold, color: lAreaColor } as EChartsAreaStyle,
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
