export const echartsFontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'

export const getEchartsBaseOption = () => ({
	animation: false,
	textStyle: { fontFamily: echartsFontFamily },
	grid: { left: 70, right: 16, top: 12, bottom: 28 },
})

export const getEchartsAxisColors = (isDark: boolean) => ({
	axisColor: isDark ? '#666' : '#ccc',
	textColor: isDark ? '#aaa' : '#666',
})

export const getEchartsTooltipColors = (isDark: boolean) => ({
	backgroundColor: isDark ? '#1f2937' : '#ffffff',
	borderColor: isDark ? '#374151' : '#e5e7eb',
	textColor: isDark ? '#e5e7eb' : '#1f2937',
})

export const echartsSeriesBase = {
	emphasis: { disabled: true },
}
