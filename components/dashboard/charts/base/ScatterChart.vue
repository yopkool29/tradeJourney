<template>
	<DashboardChartsBaseEchartsCard
		:title="title"
		:enlarged-title="enlargedTitle"
		:chart-option="chartOption"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { getEchartsBaseOption, getEchartsAxisColors, getEchartsTooltipColors } from '~/utils/chart-utils'
import { buildScatterSeries } from '~/utils/echarts-builders'

const props = defineProps({
	title: { type: String, required: true },
	enlargedTitle: { type: String, required: true },
	data: { type: Array as PropType<any[]>, required: true },
	xAxisName: { type: String },
	yAxisName: { type: String },
	xAxisMin: { type: Number },
	xAxisMax: { type: Number },
	yAxisMin: { type: Number },
	yAxisMax: { type: Number },
	tooltipFormatter: { type: Function as PropType<(params: any) => string> },
	symbolSize: { type: [Number, Function] as PropType<number | ((data: any[]) => number)> },
	loading: { type: Boolean, default: false },
	grid: {
		type: Object as PropType<{ left?: number; right?: number; top?: number; bottom?: number }>,
		default: () => ({ left: 60, right: 16, top: 24, bottom: 40 }),
	},
})

const isDark = useIsDark()

const chartOption = computed((): EChartsOption => {
	const { axisColor, textColor } = getEchartsAxisColors(isDark.value)
	const { backgroundColor, borderColor, textColor: tooltipTextColor } = getEchartsTooltipColors()

	return {
		...getEchartsBaseOption(),
		grid: props.grid,
		tooltip: {
			trigger: 'item' as const,
			backgroundColor,
			borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: 'parent',
			className: 'echarts-custom-tooltip',
			...(props.tooltipFormatter && { formatter: props.tooltipFormatter }),
		},
		xAxis: {
			type: 'value' as const,
			...(props.xAxisName && { name: props.xAxisName, nameLocation: 'middle' as const, nameGap: 25 }),
			axisLine: { lineStyle: { color: axisColor } },
			axisLabel: { color: textColor },
			nameTextStyle: { color: textColor },
			splitLine: {
				lineStyle: {
					type: 'dashed' as const,
					color: axisColor,
					opacity: 0.3,
				},
			},
			...(props.xAxisMin !== undefined && { min: props.xAxisMin }),
			...(props.xAxisMax !== undefined && { max: props.xAxisMax }),
		},
		yAxis: {
			type: 'value' as const,
			...(props.yAxisName && { name: props.yAxisName, nameLocation: 'middle' as const, nameGap: 35 }),
			axisLine: { lineStyle: { color: axisColor } },
			axisLabel: { color: textColor },
			nameTextStyle: { color: textColor },
			splitLine: {
				lineStyle: {
					type: 'dashed' as const,
					color: axisColor,
					opacity: 0.3,
				},
			},
			...(props.yAxisMin !== undefined && { min: props.yAxisMin }),
			...(props.yAxisMax !== undefined && { max: props.yAxisMax }),
		},
		series: [buildScatterSeries({
			data: props.data,
			symbolSize: props.symbolSize,
		}, isDark.value)],
	}
})
</script>
