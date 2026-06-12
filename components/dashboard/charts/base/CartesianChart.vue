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

interface ChartSeries {
	type: 'bar' | 'line'
	name: string
	data: any[]
	color?: string
	itemStyle?: any
	areaStyle?: any
	lineStyle?: any
	emphasis?: any
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
	tooltipFormatter: { type: Function as PropType<(params: any) => string> },
	yAxisFormatter: { type: Function as PropType<(v: number) => string> },
	yAxisMin: { type: Number },
	yAxisMax: { type: Number },
	loading: { type: Boolean, default: false },
	canvasHeight: { type: Number },
	grid: {
		type: Object as PropType<{ left?: number; right?: number; top?: number; bottom?: number }>,
		default: () => ({ left: 70, right: 16, top: 12, bottom: 28 }),
	},
})

const isDark = useIsDark()

const buildBaseOption = (dark: boolean): EChartsOption => {
	const { axisColor, textColor } = getEchartsAxisColors(dark)
	const { backgroundColor, borderColor, textColor: tooltipTextColor } = getEchartsTooltipColors()

	return {
		...getEchartsBaseOption(),
		tooltip: {
			trigger: 'axis' as const,
			backgroundColor,
			borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: 'parent',
			className: 'echarts-custom-tooltip',
			axisPointer: { snap: true },
		},
		grid: props.grid,
		xAxis: {
			type: 'category' as const,
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11 },
			splitLine: { show: false },
		},
		yAxis: {
			type: 'value' as const,
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11 },
			splitLine: { lineStyle: { color: axisColor } },
			...(props.yAxisMin !== undefined && { min: props.yAxisMin }),
			...(props.yAxisMax !== undefined && { max: props.yAxisMax }),
		},
	}
}

const chartOption = computed((): EChartsOption => {
	const base = buildBaseOption(isDark.value)
	const { axisColor, textColor } = getEchartsAxisColors(isDark.value)

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
			lineStyle: (s.lineStyle ?? { width: 2, color: s.color }) as any,
			itemStyle: { color: s.color },
			areaStyle: s.areaStyle,
			connectNulls: s.connectNulls ?? false,
			emphasis: { disabled: true },
		}
	})

	return {
		...base,
		xAxis: {
			...(base.xAxis as any),
			data: props.labels,
		},
		yAxis: {
			...(base.yAxis as any),
			axisLabel: {
				...(base.yAxis as any).axisLabel,
				...(props.yAxisFormatter && { formatter: (v: number) => props.yAxisFormatter!(v) }),
			},
		},
		tooltip: {
			...(base.tooltip as any),
			...(props.tooltipFormatter && { formatter: props.tooltipFormatter }),
		},
		series: mappedSeries,
	}
})
</script>
