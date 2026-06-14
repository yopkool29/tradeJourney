<template>
	<DashboardChartsBaseEchartsCard
		:title="title"
		:enlarged-title="enlargedTitle"
		:chart-option="chartOption"
		:loading="loading"
	/>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { EChartsOption } from 'echarts'
import { getEchartsBaseOption, getEchartsAxisColors, getEchartsTooltipColors } from '~/utils/chart-utils'
import type { BarDataItem } from '~/utils/echarts-builders'

type FormatterParams = {
	seriesName?: string
	name?: string
	value: number
	dataIndex: number
	seriesIndex: number
	data: unknown
}

const props = defineProps({
	title: { type: String, required: true },
	enlargedTitle: { type: String, required: true },
	categories: { type: Array as PropType<string[]>, required: true },
	data: { type: Array as PropType<BarDataItem[]>, required: true },
	colors: { type: Array as PropType<string[]>, default: () => [] },
	tooltipFormatter: { type: Function as PropType<(params: FormatterParams | FormatterParams[]) => string>, default: undefined },
	xAxisFormatter: { type: Function as PropType<(v: number) => string>, default: undefined },
	loading: { type: Boolean, default: false },
	barMaxWidth: { type: Number, default: 24 },
	labelFormatter: { type: Function as PropType<(params: FormatterParams) => string>, default: undefined },
	grid: {
		type: Object as PropType<{ left?: number; right?: number; top?: number; bottom?: number }>,
		default: () => ({ left: 80, right: 80, top: 12, bottom: 28 }),
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
			trigger: 'axis' as const,
			backgroundColor,
			borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: 'parent',
			className: 'echarts-custom-tooltip',
			axisPointer: { snap: true },
			...(props.tooltipFormatter && { formatter: props.tooltipFormatter }),
		},
		xAxis: {
			type: 'value' as const,
			axisLine: { lineStyle: { color: axisColor } },
			axisLabel: {
				color: textColor,
				...(props.xAxisFormatter && { formatter: (v: number) => props.xAxisFormatter!(v) }),
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
			data: props.categories,
			axisLine: { lineStyle: { color: axisColor } },
			axisLabel: {
				color: textColor,
				overflow: 'truncate' as const,
				width: 70,
			},
			inverse: true,
		},
		series: [{
			type: 'bar' as const,
			data: props.data,
			barMaxWidth: props.barMaxWidth,
			emphasis: { disabled: true },
			...(props.colors && { itemStyle: { color: (params: any) => props.colors![params.dataIndex] } }),
			...(props.labelFormatter && {
				label: {
					show: true,
					position: 'right',
					formatter: props.labelFormatter,
					fontSize: 12,
					color: textColor,
					textBorderColor: 'transparent',
					textBorderWidth: 0,
				},
			}),
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
