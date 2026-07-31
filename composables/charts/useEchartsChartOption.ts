import type { EChartsOption } from 'echarts'
import type { EChartsGridOption } from '~/utils/echarts-builders'
import { getEchartsBaseOption, getEchartsAxisColors, getEchartsTooltipColors } from '~/utils/chart-utils'

type CrosshairType = 'cross' | 'line'

export const useEchartsChartOption = () => {
	const isDark = useIsDark()

	// Retourne toutes les couleurs et options de base pour un chart ECharts
	const getChartContext = (grid?: EChartsGridOption) => {
		const base = getEchartsBaseOption()
		const { axisColor, textColor } = getEchartsAxisColors(isDark.value)
		const { backgroundColor, borderColor, textColor: tooltipTextColor } = getEchartsTooltipColors()
		return {
			base,
			axisColor,
			textColor,
			backgroundColor,
			borderColor,
			tooltipTextColor,
			isDark: isDark.value,
			grid: grid || { left: 70, right: 16, top: 12, bottom: 28 },
		}
	}

	// Configuration du réticule (crosshair) selon le type
	const getCrosshairConfig = (type: CrosshairType) => {
		const pointerLineColor = isDark.value ? '#9ca3af' : '#888'
		const pointerLabelBg = isDark.value ? '#374151' : '#666'
		if (type === 'cross') {
			return {
				type: 'cross' as const,
				snap: true,
				lineStyle: { color: pointerLineColor, type: 'dashed' as const },
				crossStyle: { color: pointerLineColor, type: 'dashed' as const },
				label: { show: true, color: '#fff', backgroundColor: pointerLabelBg },
			}
		}
		return {
			type: 'line' as const,
			snap: true,
			lineStyle: { color: pointerLineColor, type: 'dashed' as const },
			label: { show: true, color: '#fff', backgroundColor: pointerLabelBg },
		}
	}

	// Tooltip de base avec crosshair
	const buildTooltip = (ctx: ReturnType<typeof getChartContext>, axisPointer: ReturnType<typeof getCrosshairConfig>) => ({
		backgroundColor: ctx.backgroundColor,
		borderColor: ctx.borderColor,
		textStyle: { color: ctx.tooltipTextColor, fontSize: 13 },
		appendTo: document.body,
		className: 'echarts-custom-tooltip',
		trigger: 'axis' as const,
		axisPointer,
	})

	return { getChartContext, getCrosshairConfig, buildTooltip, isDark }
}
