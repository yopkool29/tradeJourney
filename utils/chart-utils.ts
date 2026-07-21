import type { EChartsOption } from 'echarts'

export const echartsFontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'

export const getEchartsBaseOption = (fontFamily?: string): Partial<EChartsOption> => ({
	animation: true,
	animationDuration: 300,
	animationEasing: 'cubicOut' as const,
	textStyle: { fontFamily: fontFamily || echartsFontFamily },
	grid: { left: 70, right: 16, top: 12, bottom: 28 },
})

export const getEchartsAxisColors = (isDark: boolean) => ({
	axisColor: isDark ? '#4b5563' : '#ccc',
	textColor: isDark ? '#eeeeee' : '#444',
})

export const getEchartsTooltipColors = () => ({
	backgroundColor: 'rgba(0, 0, 0, 0.8)',
	borderColor: 'transparent',
	textColor: '#e5e7eb',
})

export const getEchartsCenterTextGraphic = (text: string, textColor: string, fontFamily: string) => ({
	type: 'text' as const,
	left: 'center' as const,
	top: 'center' as const,
	style: {
		text,
		textAlign: 'center' as const,
		textVerticalAlign: 'middle' as const,
		fontSize: 18,
		fontWeight: 'bold' as const,
		fill: textColor,
		fontFamily,
	},
})

export const echartsSeriesBase = {
	emphasis: { disabled: true },
}
