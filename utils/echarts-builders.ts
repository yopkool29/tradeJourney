import type { EChartsOption, LineSeriesOption, ScatterSeriesOption, HeatmapSeriesOption, VisualMapComponentOption } from 'echarts'

export type EChartsGridOption = {
	left?: number
	right?: number
	top?: number
	bottom?: number
}

export type EChartsItemStyle = {
	color?: string
	borderRadius?: number | number[]
	borderColor?: string
	borderWidth?: number
}

export type EChartsLineStyle = {
	width?: number
	color?: string
	type?: 'solid' | 'dashed' | 'dotted'
}

export type EChartsAreaStyle = {
	color?: string
	opacity?: number
	origin?: number | 'start' | 'end' | 'auto'
}

export type EChartsSeriesEmphasis = {
	disabled?: boolean
	itemStyle?: EChartsItemStyle
}

export type EChartsFormatterParams<V = number> = {
	seriesName?: string
	name?: string
	value: V
	dataIndex: number
	seriesIndex: number
	data: unknown
}

export interface BarDataItem {
	value: number
	itemStyle?: {
		color?: string
		borderRadius?: number | number[]
	}
}

export interface BarSeriesConfig {
	data: BarDataItem[]
	barMaxWidth?: number
	emphasis?: {
		disabled?: boolean
		itemStyle?: {
			borderColor?: string
			borderWidth?: number
		}
	}
}

export interface LineSeriesConfig {
	name: string
	data: (number | null)[]
	color: string
	smooth?: number
	symbol?: string
	symbolSize?: number
	showSymbol?: boolean
	areaStyle?: EChartsAreaStyle
	lineStyle?: EChartsLineStyle
	connectNulls?: boolean
}

export type ScatterDataPoint = {
	value: number[]
	itemStyle?: {
		color?: string
		borderColor?: string
		borderWidth?: number
		borderType?: string
	}
}

export interface ScatterSeriesConfig {
	data: ScatterDataPoint[]
	symbolSize?: number | ((data: unknown[]) => number)

	emphasis?: {
		scale?: number
		itemStyle?: {
			borderColor?: string
			borderWidth?: number
		}
	}
}

export interface HeatmapSeriesConfig {
	data: [number | string, number | string, number][]
	name?: string
}

export interface VisualMapConfig {
	min: number
	max: number
	inRange?: { color?: string[] }
	outOfRange?: { color?: string }
}

export const buildBarColors = (
	values: number[],
	positiveColor: string,
	negativeColor: string,
	neutralColor: string
): string[] => {
	return values.map(v =>
		v > 0 ? positiveColor : v < 0 ? negativeColor : neutralColor
	)
}

export const buildBarData = (
	values: number[],
	colors: string[],
	borderRadiusFn?: (v: number) => number[]
): BarDataItem[] => {
	return values.map((v, i) => ({
		value: v,
		itemStyle: {
			color: colors[i],
			borderRadius: borderRadiusFn ? borderRadiusFn(v) : [3, 3, 0, 0],
		},
	}))
}

export const buildBarSeries = (config: BarSeriesConfig): EChartsOption['series'] => {
	return [{
		type: 'bar' as const,
		data: config.data,
		barMaxWidth: config.barMaxWidth ?? 32,
		emphasis: config.emphasis ?? { disabled: true },
	}]
}

export const buildLineSeries = (config: LineSeriesConfig): LineSeriesOption => {
	return {
		type: 'line' as const,
		name: config.name,
		data: config.data,
		smooth: config.smooth ?? 0.2,
		symbol: config.symbol ?? 'circle',
		symbolSize: config.symbolSize ?? 4,
		showSymbol: config.showSymbol ?? (config.symbolSize === 0 ? false : undefined),
		lineStyle: (config.lineStyle ?? { width: 2, color: config.color }) as LineSeriesOption['lineStyle'],
		itemStyle: { color: config.color },
		areaStyle: config.areaStyle as LineSeriesOption['areaStyle'],
		connectNulls: config.connectNulls ?? false,
		emphasis: { disabled: true },
	}
}

export const buildScatterSeries = (config: ScatterSeriesConfig, isDark?: boolean): ScatterSeriesOption => {
	return {
		type: 'scatter' as const,
		data: config.data as ScatterSeriesOption['data'],
		symbolSize: config.symbolSize ?? 10,
		emphasis: config.emphasis ?? {
			scale: 1.3,
			itemStyle: {
				borderColor: isDark ? '#ffffff' : '#1f2937',
				borderWidth: 2,
			},
		},
	}
}

export const buildHeatmapSeries = (config: HeatmapSeriesConfig, isDark?: boolean): HeatmapSeriesOption => {
	return {
		name: config.name ?? 'Heatmap',
		type: 'heatmap' as const,
		data: config.data,
		label: { show: false },
		emphasis: {
			itemStyle: {
				borderColor: isDark ? '#ffffff' : '#1f2937',
				borderWidth: 2,
			},
		},
	}
}

export const buildVisualMap = (config: VisualMapConfig, isDark?: boolean): VisualMapComponentOption => {
	return {
		min: config.min,
		max: config.max,
		calculable: true,
		orient: 'horizontal' as const,
		left: 'center',
		bottom: 0,
		show: false,
		inRange: config.inRange ?? {
			color: ['#000000', '#2a1500', '#552a00', '#803f00', '#ab5500', '#d66a00', '#ff8000', '#ffaa33', '#ffd480', '#fff5cc'],
		},
		outOfRange: config.outOfRange ?? {
			color: isDark ? '#111827' : '#f3f4f6',
		},
	}
}
