<template>
	<DashboardChartsBaseEchartsCard
		:title="title"
		:enlarged-title="enlargedTitle"
		:chart-option="chartOption"
		:loading="loading"
		:modal-max-width="modalMaxWidth"
		:modal-height-class="modalHeightClass"
	/>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { EChartsOption } from 'echarts'
import { getEchartsBaseOption, getEchartsAxisColors, getEchartsTooltipColors } from '~/utils/chart-utils'
import type { BarDataItem, EChartsFormatterParams, EChartsGridOption } from '~/utils/echarts-builders'

const props = defineProps({
	title: { type: String, required: true },
	enlargedTitle: { type: String, required: true },
	categories: { type: Array as PropType<string[]>, required: true },
	data: { type: Array as PropType<BarDataItem[]>, required: true },
	colors: { type: Array as PropType<string[]>, default: () => [] },
	tooltipFormatter: { type: Function as PropType<(params: EChartsFormatterParams | EChartsFormatterParams[]) => string>, default: undefined },
	xAxisFormatter: { type: Function as PropType<(v: number) => string>, default: undefined },
	loading: { type: Boolean, default: false },
	barMaxWidth: { type: Number, default: 24 },
	labelFormatter: { type: Function as PropType<(params: EChartsFormatterParams) => string>, default: undefined },
	grid: {
		type: Object as PropType<EChartsGridOption>,
		default: () => ({ left: 80, right: 80, top: 12, bottom: 28 }),
	},
	modalMaxWidth: { type: String, default: undefined },
	modalHeightClass: { type: String, default: undefined },
})

const isDark = useIsDark()

const chartOption = computed((): EChartsOption => {
	const { axisColor, textColor } = getEchartsAxisColors(isDark.value)
	const { backgroundColor, borderColor, textColor: tooltipTextColor } = getEchartsTooltipColors()

	return {
		...getEchartsBaseOption(),
		grid: props.grid,
		dataZoom: [],
		tooltip: {
			trigger: 'axis' as const,
			backgroundColor,
			borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: 'parent',
			className: 'echarts-custom-tooltip',
			axisPointer: { snap: true },
			...(props.tooltipFormatter && { formatter: (params: unknown) => props.tooltipFormatter!(params as EChartsFormatterParams | EChartsFormatterParams[]) }),
		} as EChartsOption['tooltip'],
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
			...(props.colors && { itemStyle: { color: (params: { dataIndex: number }) => props.colors![params.dataIndex] } }),
			...(props.labelFormatter && {
				label: {
					show: true,
					position: 'right',
					formatter: (params: unknown) => props.labelFormatter!(params as EChartsFormatterParams),
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
