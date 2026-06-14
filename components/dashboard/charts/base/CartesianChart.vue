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
import type { EChartsFormatterParams, EChartsItemStyle, EChartsLineStyle, EChartsAreaStyle, EChartsSeriesEmphasis, EChartsGridOption } from '~/utils/echarts-builders'

type ChartSeriesDataItem = number | null | { value: number; itemStyle?: EChartsItemStyle }

interface ChartSeries {
	type: 'bar' | 'line'
	name: string
	data: ChartSeriesDataItem[]
	color?: string
	itemStyle?: EChartsItemStyle
	areaStyle?: EChartsAreaStyle
	lineStyle?: EChartsLineStyle
	emphasis?: EChartsSeriesEmphasis
	barMaxWidth?: number
	connectNulls?: boolean
	showSymbol?: boolean
	symbol?: string
	symbolSize?: number
	smooth?: number
}

const props = defineProps({
	title: { type: String, required: true },
	enlargedTitle: { type: String, required: true },
	labels: { type: Array as PropType<string[]>, required: true },
	series: { type: Array as PropType<ChartSeries[]>, required: true },
	tooltipFormatter: { type: Function as PropType<(params: EChartsFormatterParams, labels: string[]) => string>, default: undefined },
	yAxisFormatter: { type: Function as PropType<(v: number) => string>, default: undefined },
	yAxisMin: { type: Number, default: undefined },
	yAxisMax: { type: Number, default: undefined },
	loading: { type: Boolean, default: false },
	canvasHeight: { type: Number, default: undefined },
	grid: {
		type: Object as PropType<EChartsGridOption>,
		default: () => ({ left: 70, right: 16, top: 12, bottom: 28 }),
	},
})

const isDark = useIsDark()

const chartOption = computed((): EChartsOption => {
	const { axisColor, textColor } = getEchartsAxisColors(isDark.value)
	const { backgroundColor, borderColor, textColor: tooltipTextColor } = getEchartsTooltipColors()

	const mappedSeries = props.series.map((s) => {
		if (s.type === 'bar') {
			return {
				type: 'bar' as const,
				name: s.name,
				data: s.data,
				barMaxWidth: s.barMaxWidth ?? 32,
				emphasis: s.emphasis ?? { disabled: true },
				itemStyle: s.itemStyle,
			}
		}
		return {
			type: 'line' as const,
			name: s.name,
			data: s.data,
			smooth: s.smooth ?? 0.2,
			symbol: s.symbol ?? 'circle',
			symbolSize: s.symbolSize ?? 4,
			showSymbol: s.showSymbol ?? (s.symbolSize === 0 ? false : undefined),
			lineStyle: s.lineStyle ?? { width: 2, color: s.color },
			itemStyle: { color: s.color },
			areaStyle: s.areaStyle,
			connectNulls: s.connectNulls ?? false,
			emphasis: { disabled: true },
		}
	})

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
			...(props.tooltipFormatter && { formatter: (params: unknown) => props.tooltipFormatter!(params as EChartsFormatterParams, props.labels) }),
		} as EChartsOption['tooltip'],
		xAxis: {
			type: 'category' as const,
			data: props.labels,
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11 },
			splitLine: { show: false },
		},
		yAxis: {
			type: 'value' as const,
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: {
				color: textColor,
				fontSize: 11,
				...(props.yAxisFormatter && { formatter: (v: number) => props.yAxisFormatter!(v) }),
			},
			splitLine: { lineStyle: { color: axisColor } },
			...(props.yAxisMin !== undefined && { min: props.yAxisMin }),
			...(props.yAxisMax !== undefined && { max: props.yAxisMax }),
		},
		series: mappedSeries,
	}
})
</script>
