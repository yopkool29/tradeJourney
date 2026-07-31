export const useEchartsChart = () => {
	const appConfig = useAppConfig()
	const canvasHeight = computed(() => appConfig.charts.options.canvasHeight)
	const isModalOpen = ref(false)

	const getBaseChartOption = (isDark: boolean) => {
		const { axisColor, textColor } = getEchartsAxisColors(isDark)
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
			grid: { left: 70, right: 16, top: 12, bottom: 28 },
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
			},
		}
	}

	return { canvasHeight, isModalOpen, getBaseChartOption }
}
