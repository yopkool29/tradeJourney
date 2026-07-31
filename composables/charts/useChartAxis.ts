import type { EChartsOption } from 'echarts'
import type { BreakdownMetric } from '~/type'
import { computeAxisBounds, scaleValue, makeAxisLabel } from '~/composables/charts/useAxisScale'
import type { AxisBounds } from '~/composables/charts/useAxisScale'
import { formatMetricValueForMetric } from '~/composables/analytics/breakdownMetrics'

export interface AxisConfig {
	bounds: AxisBounds
	min: number
	max: number
	formatter: (v: number) => string
}

export interface DataZoomConfig {
	hasZoom: boolean
	zoomEnd: number
	sliders: NonNullable<EChartsOption['dataZoom']>
}

export const useChartAxis = () => {
	const buildAxisConfig = (
		data: number[],
		metric: BreakdownMetric,
		useLogScale: boolean,
		options?: {
			forceMin?: number
			forceMax?: number
		}
	): AxisConfig => {
		const finiteData = data.filter(v => Number.isFinite(v))
		const bounds = metric === 'winrate'
			? { axisMin: 0, axisMax: 100, minVal: 0, maxVal: 100, step: 12.5, logMin: 0, logMinNeg: 0 }
			: computeAxisBounds(finiteData)

		const min = options?.forceMin ?? bounds.axisMin
		const max = options?.forceMax ?? bounds.axisMax

		const formatter = makeAxisLabel(bounds, useLogScale, v => formatMetricValueForMetric(v, metric))

		return { bounds, min, max, formatter }
	}

	const buildDataZoomConfig = (
		itemCount: number,
		orientation: 'horizontal' | 'vertical',
		options?: {
			threshold?: number
			visibleCount?: number
			showSlider?: boolean
		}
	): DataZoomConfig => {
		const threshold = options?.threshold ?? 20
		const visibleCount = options?.visibleCount ?? 20
		const showSlider = options?.showSlider ?? true
		const hasZoom = itemCount > threshold
		const zoomEnd = hasZoom ? Math.min(100, (visibleCount / itemCount) * 100) : 100

		if (!hasZoom) {
			return { hasZoom: false, zoomEnd: 100, sliders: [] }
		}

		const axisIndex = orientation === 'horizontal' ? 0 : 0
		const sliders: NonNullable<EChartsOption['dataZoom']> = []

		if (orientation === 'horizontal') {
			if (showSlider) {
				sliders.push({
					type: 'slider',
					xAxisIndex: axisIndex,
					start: 0,
					end: zoomEnd,
					height: 20,
					bottom: 5,
					filterMode: 'filter',
				})
			}
			sliders.push({
				type: 'inside',
				xAxisIndex: axisIndex,
				start: 0,
				end: zoomEnd,
				filterMode: 'filter',
				moveOnMouseWheel: 'shift',
				zoomOnMouseWheel: false,
			})
		} else {
			if (showSlider) {
				sliders.push({
					type: 'slider',
					yAxisIndex: axisIndex,
					start: 0,
					end: zoomEnd,
					width: 20,
					right: 5,
					filterMode: 'filter',
				})
			}
			sliders.push({
				type: 'inside',
				yAxisIndex: axisIndex,
				start: 0,
				end: zoomEnd,
				filterMode: 'filter',
				moveOnMouseWheel: 'shift',
				zoomOnMouseWheel: false,
			})
		}

		return { hasZoom, zoomEnd, sliders }
	}

	const buildScatter2DDataZoom = (
		showScrollX: boolean,
		showScrollY: boolean
	): NonNullable<EChartsOption['dataZoom']> => {
		const zoomArr: NonNullable<EChartsOption['dataZoom']> = [
			{ type: 'inside', xAxisIndex: 0, filterMode: 'none', moveOnMouseWheel: 'shift', zoomOnMouseWheel: true },
			{ type: 'inside', yAxisIndex: 0, filterMode: 'none', moveOnMouseWheel: 'shift', zoomOnMouseWheel: true },
		]
		if (showScrollX) {
			zoomArr.push({ type: 'slider', xAxisIndex: 0, filterMode: 'none', height: 18, bottom: 5, start: 0, end: 100 })
		}
		if (showScrollY) {
			zoomArr.push({ type: 'slider', yAxisIndex: 0, filterMode: 'none', width: 18, right: 5, start: 0, end: 100 })
		}
		return zoomArr
	}

	return {
		buildAxisConfig,
		buildDataZoomConfig,
		buildScatter2DDataZoom,
		scaleValue,
		computeAxisBounds,
	}
}
