import type { EChartsOption, SeriesOption } from 'echarts'
import type { BreakdownMetric, BreakdownDimension, TradeProperty, TradeTooltipField } from '~/type'
import type { BreakdownMetrics } from '~/composables/analytics/breakdownMetrics'
import type { HeatmapCell2D } from '~/composables/analytics/useAnalytics'
import type { TradeExtendedType } from '~/schema/trade'
import { getMetricValueForMetric, getMetricColor, formatMetricValueForMetric } from '~/composables/analytics/breakdownMetrics'
import { buildBarData, buildBarSeries, buildScatterSeries, formatTradeTooltipField } from '~/utils/dashboard'
import type { EChartsFormatterParams } from '~/utils/dashboard'
import { buildTooltipLines } from '~/composables/charts/useTooltipMetrics'
import { useChartAxis } from './useChartAxis'
import { useChartTooltip } from './useChartTooltip'

export interface BarChartConfig {
	metrics: BreakdownMetrics[]
	dimension: BreakdownDimension
	metric: BreakdownMetric
	logScale: boolean
	selectedTooltipMetrics: BreakdownMetric[]
	orientation: 'horizontal' | 'vertical'
	colors: { profit: string; loss: string; bar: string; rawMetric: string }
}

export interface ScatterChartConfig {
	metrics: BreakdownMetrics[]
	dimension: BreakdownDimension
	metric: BreakdownMetric
	selectedTooltipMetrics: BreakdownMetric[]
	colors: { profit: string; loss: string; bar: string; rawMetric: string }
	isDark: boolean
}

const getRawMetricValue = (m: BreakdownMetrics, metric: BreakdownMetric): number => {
	if (metric !== 'tradesCount' && m.tradesCount === 0) return NaN
	switch (metric) {
		case 'pnl': return m.pnl
		case 'winrate': return m.winrate
		case 'profitFactor': return m.profitFactor
		case 'avgWin': return m.avgWin
		case 'avgLoss': return -m.avgLoss
		case 'expectancy': return m.expectancy
		case 'avgDuration': return m.avgDuration
		case 'drawdown': return m.drawdown
		case 'currentDrawdown': return m.currentDrawdown
		case 'tradesCount': return m.tradesCount
		case 'appt': return m.tradesCount > 0 ? m.pnl / m.tradesCount : NaN
		default: return 0
	}
}

export const useChartBuilder = () => {
	const { getChartContext } = useEchartsChartOption()
	const { buildAxisConfig, buildDataZoomConfig, scaleValue, buildScatter2DDataZoom, computeAxisBounds } = useChartAxis()
	const { buildTooltipBlock, formatDimensionLabel, formatBreakdownTooltip, sortDimensionKeys, formatScatter2DTooltip } = useChartTooltip()
	const { t } = useI18n()

	// Calcule l'interval des splitLines pour qu'elles tombent sur 0%, 12.5%, ..., 100%
	// (9 lignes, 8 intervalles) — cohérent avec le step de computeAxisBounds
	const splitInterval = (axisMin: number, axisMax: number): number => {
		const range = axisMax - axisMin
		return range / 8
	}

	const buildBarChartOption = (config: BarChartConfig): EChartsOption => {
		const { metrics, dimension, metric, logScale, selectedTooltipMetrics, orientation, colors } = config

		const categories = metrics.map(m => formatDimensionLabel(dimension, m.key))
		const rawValues = metrics.map(m => getRawMetricValue(m, metric))
		const finiteValues = rawValues.filter(v => Number.isFinite(v))

		const axisConfig = buildAxisConfig(finiteValues, metric, logScale)
		// NaN (pas de donnée) → null (pas de bar), valeurs réelles → clamp aux bornes
		const scaledValues = rawValues.map(v => isNaN(v) ? null : scaleValue(v, axisConfig.bounds, logScale))

		const itemColors = metrics.map(m => getMetricColor(m, metric, colors))
		const borderRadiusFn = orientation === 'horizontal'
			? (v: number) => v >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3]
			: (v: number) => v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3]
		const data = buildBarData(scaledValues, itemColors, borderRadiusFn)
		const series = buildBarSeries({
			data,
			barMaxWidth: orientation === 'horizontal' ? 16 : 20,
			barCategoryGap: '10%',
			emphasis: { disabled: true },
		})

		const gridConfig = orientation === 'horizontal'
			? { left: 80, right: 80, top: 12, bottom: 28 }
			: { left: 60, right: 16, top: 12, bottom: 60 }
		const ctx = getChartContext(gridConfig)
		const { base, axisColor, textColor, grid } = ctx

		// Forcer l'interval des splitLines pour qu'elles tombent sur 0%, 12.5%, ..., 100%
		const barInterval = splitInterval(axisConfig.min, axisConfig.max)

		const zoomConfig = buildDataZoomConfig(
			categories.length,
			orientation === 'horizontal' ? 'vertical' : 'horizontal',
			{ threshold: 20, visibleCount: 20 }
		)

		const chartOption: EChartsOption = {
			...base,
			tooltip: buildTooltipBlock((params: EChartsFormatterParams | EChartsFormatterParams[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const m = metrics[p.dataIndex]
				if (!m) return ''
				const isEmpty = m.tradesCount === 0
				const metricValue = getMetricValueForMetric(m, metric)
				return formatBreakdownTooltip(
					formatDimensionLabel(dimension, m.key),
					metric,
					metricValue,
					m,
					selectedTooltipMetrics,
					isEmpty
				)
			}, 'axis'),
			grid: orientation === 'horizontal' && zoomConfig.hasZoom
				? { ...grid, right: 100 }
				: grid,
			dataZoom: zoomConfig.hasZoom ? zoomConfig.sliders : undefined,
			series,
		}

		if (orientation === 'horizontal') {
			chartOption.xAxis = {
				type: 'value',
				min: axisConfig.min,
				max: axisConfig.max,
				interval: barInterval,
				axisLine: { lineStyle: { color: axisColor } },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 11, formatter: axisConfig.formatter },
				splitLine: { lineStyle: { color: axisColor } },
			}
			chartOption.yAxis = {
				type: 'category',
				data: categories,
				inverse: true,
				axisLine: { lineStyle: { color: axisColor } },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 11 },
				splitLine: { show: false },
			}
		} else {
			chartOption.xAxis = {
				type: 'category',
				data: categories,
				axisLine: { lineStyle: { color: axisColor } },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 11, interval: 0, rotate: categories.length > 6 ? 30 : 0 },
				splitLine: { show: false },
			}
			chartOption.yAxis = {
				type: 'value',
				min: axisConfig.min,
				max: axisConfig.max,
				interval: barInterval,
				axisLine: { lineStyle: { color: axisColor } },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 11, formatter: axisConfig.formatter },
				splitLine: { lineStyle: { color: axisColor } },
			}
		}

		return chartOption
	}

	const buildScatterChartOption = (config: ScatterChartConfig): EChartsOption => {
		const { metrics, dimension, metric, selectedTooltipMetrics, colors, isDark } = config

		const categories = metrics.map(m => formatDimensionLabel(dimension, m.key))
		const data = metrics.map((m, idx) => ({
			value: [
				idx,
				getMetricValueForMetric(m, metric),
				m.pnl,
				m.key,
				m.tradesCount,
			] as unknown as number[],
			itemStyle: {
				color: getMetricColor(m, metric, colors),
				borderColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)',
				borderWidth: 1,
				borderType: 'solid' as const,
			},
		}))

		const ctx = getChartContext({ left: 60, right: 16, top: 24, bottom: categories.length > 20 ? 60 : 40 })
		const { base, axisColor, textColor, grid } = ctx

		const yAxisName = t(`components.dashboard.breakdown.metrics.${metric}`)
		const yAxisMin = metric === 'winrate' ? 0 : undefined
		const yAxisMax = metric === 'winrate' ? 100 : undefined

		const zoomConfig = buildDataZoomConfig(categories.length, 'horizontal', { threshold: 25, visibleCount: 25 })

		return {
			...base,
			tooltip: buildTooltipBlock((params: EChartsFormatterParams<number | number[]> | EChartsFormatterParams<number | number[]>[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const v = p.value as number[]
				const idx = v[0]
				const metricValue = v[1]
				const key = String(v[3])
				const fullMetric = metrics[idx]
				const isEmpty = fullMetric?.tradesCount === 0
				return formatBreakdownTooltip(
					formatDimensionLabel(dimension, key),
					metric,
					metricValue,
					fullMetric,
					selectedTooltipMetrics,
					isEmpty
				)
			}),
			grid,
			dataZoom: zoomConfig.hasZoom ? zoomConfig.sliders : undefined,
			xAxis: {
				type: 'category',
				data: categories,
				axisLine: { lineStyle: { color: axisColor } },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 11, interval: 0, rotate: categories.length > 6 ? 30 : 0 },
				splitLine: { show: false },
			},
			yAxis: {
				type: 'value',
				name: yAxisName,
				min: yAxisMin,
				max: yAxisMax,
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 11, formatter: (v: number) => {
					const axisConfig = buildAxisConfig([v], metric, false)
					return axisConfig.formatter(v)
				} },
				splitLine: { lineStyle: { color: axisColor } },
				nameTextStyle: { color: textColor, fontSize: 11 },
			},
			series: buildScatterSeries({
				data,
				symbolSize: (d: unknown[]) => {
					const pnl = Math.abs(d[2] as number)
					return Math.min(12, Math.max(8, Math.sqrt(pnl) / 12))
				},
			}, isDark),
		}
	}

	const buildScatter2DChartOption = (config: {
		metrics: BreakdownMetrics[]
		dimension: BreakdownDimension
		metricX: BreakdownMetric
		metricY: BreakdownMetric
		colorMetric: BreakdownMetric
		logScale: boolean
		selectedTooltipMetrics: BreakdownMetric[]
		showScrollX: boolean
		showScrollY: boolean
		showLabels: boolean
		scatter2DColors: { min: string; mid: string; max: string }
		isDark: boolean
	}): EChartsOption => {
		const { metrics, dimension, metricX, metricY, colorMetric, logScale, selectedTooltipMetrics, showScrollX, showScrollY, showLabels, scatter2DColors, isDark } = config

		const rawPoints = metrics.map(m => ({
			vx: getRawMetricValue(m, metricX),
			vy: getRawMetricValue(m, metricY),
			vc: getRawMetricValue(m, colorMetric),
			key: m.key,
		}))

		const ctx = getChartContext({ left: 70, right: 40, top: 85, bottom: 40 })
		const { base, axisColor, textColor, grid } = ctx

		const xFinite = rawPoints.filter(p => Number.isFinite(p.vx)).map(p => p.vx)
		const yFinite = rawPoints.filter(p => Number.isFinite(p.vy)).map(p => p.vy)

		const xAxisConfig = buildAxisConfig(xFinite, metricX, logScale)
		const yAxisConfig = buildAxisConfig(yFinite, metricY, logScale)

		// Clamp colorMetric to a finite value so points with Infinity (e.g. profitFactor
		// when no losses) are still displayed on the chart instead of being filtered out
		const clampColorValue = (v: number): number => {
			if (!Number.isFinite(v)) return v > 0 ? 999 : -999
			return v
		}

		const data = rawPoints
			.map(p => ({
				value: [
					scaleValue(p.vx, xAxisConfig.bounds, logScale),
					scaleValue(p.vy, yAxisConfig.bounds, logScale),
					p.key,
					clampColorValue(p.vc),
					p.vx,
					p.vy,
				] as unknown as number[],
			}))
			.filter(p => Number.isFinite(p.value[0] as number) && Number.isFinite(p.value[1] as number))

		const colorValues = data.map(d => d.value[3] as number)
		const colorMin = Math.min(...colorValues, 0)
		const colorMax = Math.max(...colorValues, 1)
		const colorPalette = [scatter2DColors.min, scatter2DColors.mid, scatter2DColors.max]

		const dataZoom = buildScatter2DDataZoom(showScrollX, showScrollY)

		const xInterval = splitInterval(xAxisConfig.min, xAxisConfig.max)
		const yInterval = splitInterval(yAxisConfig.min, yAxisConfig.max)

		return {
			...base,
			tooltip: buildTooltipBlock((params: EChartsFormatterParams<number | number[]> | EChartsFormatterParams<number | number[]>[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const v = p.value as number[]
				const realVx = v[4] as number
				const realVy = v[5] as number
				const key = String(v[2])
				const fullMetric = metrics.find(m => m.key === key)
				return formatScatter2DTooltip(
					formatDimensionLabel(dimension, key),
					metricX,
					metricY,
					colorMetric,
					realVx,
					realVy,
					v[3] as number,
					fullMetric,
					selectedTooltipMetrics
				)
			}),
			grid,
			visualMap: {
				min: colorMin,
				max: colorMax,
				dimension: 3,
				calculable: true,
				orient: 'horizontal',
				left: 70,
				top: 10,
				textStyle: { color: textColor, fontSize: 10 },
				inRange: { color: colorPalette },
				show: true,
			},
			dataZoom,
			xAxis: {
				min: xAxisConfig.min,
				max: xAxisConfig.max,
				interval: xInterval,
				axisLine: { lineStyle: { color: axisColor } },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 11, formatter: xAxisConfig.formatter },
				splitLine: { lineStyle: { color: axisColor } },
				name: t(`components.dashboard.breakdown.metrics.${metricX}`),
				nameLocation: 'middle',
				nameGap: 30,
				nameTextStyle: { color: textColor, fontSize: 12, fontWeight: 'bold' },
			},
			yAxis: {
				type: 'value',
				name: t(`components.dashboard.breakdown.metrics.${metricY}`),
				min: yAxisConfig.min,
				max: yAxisConfig.max,
				interval: yInterval,
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 11, formatter: yAxisConfig.formatter },
				splitLine: { lineStyle: { color: axisColor } },
				nameLocation: 'middle',
				nameGap: 50,
				nameTextStyle: { color: textColor, fontSize: 12, fontWeight: 'bold' },
			},
			series: [{
				type: 'scatter',
				data,
				symbolSize: 10,
				emphasis: {
					scale: 1.4,
					itemStyle: { borderColor: isDark ? '#fff' : '#1f2937', borderWidth: 2 },
				},
				label: {
					show: showLabels,
					position: 'top',
					formatter: (p: { value: number[] }) => {
						const key = String(p.value[2])
						return formatDimensionLabel(dimension, key)
					},
					color: textColor,
					fontSize: 12,
				},
			}] as SeriesOption[],
		}
	}

	const buildScatterTradesChartOption = (config: {
		trades: TradeExtendedType[]
		propX: TradeProperty
		propY: TradeProperty
		logScale: boolean
		showScrollX: boolean
		showScrollY: boolean
		profitColor: string
		lossColor: string
		displayModeNet: boolean
		selectedTooltipMetrics: TradeTooltipField[]
	}): EChartsOption => {
		const { trades, propX, propY, logScale, showScrollX, showScrollY, profitColor, lossColor, displayModeNet, selectedTooltipMetrics } = config

		const getTradePropertyValue = (tr: TradeExtendedType, prop: TradeProperty): number => {
			switch (prop) {
				case 'duration': {
					const ms = tr.closeDate.getTime() - tr.openDate.getTime()
					return ms > 0 ? ms / 60000 : 0
				}
				case 'pnl': return displayModeNet ? tr.netProfit : tr.profit
				case 'mfe': return tr.mfe ?? NaN
				case 'mae': return tr.mae ?? NaN
				default: return 0
			}
		}

		const formatTradePropertyValue = (val: number, prop: TradeProperty): string => {
			if (prop === 'duration') {
				if (val < 60) return `${val.toFixed(0)}m`
				if (val < 1440) return `${(val / 60).toFixed(1)}h`
				return `${(val / 1440).toFixed(1)}d`
			}
			return formatMetricValueForMetric(val, 'pnl')
		}

		const rawPoints = trades.map(tr => {
			const ms = tr.closeDate.getTime() - tr.openDate.getTime()
			const durationMin = ms > 0 ? ms / 60000 : 0
			return {
				vx: getTradePropertyValue(tr, propX),
				vy: getTradePropertyValue(tr, propY),
				duration: durationMin,
				tr,
			}
		})

		const ctx = getChartContext({ left: 70, right: 40, top: 50, bottom: 40 })
		const { base, axisColor, textColor, grid } = ctx

		const xFinite = rawPoints.filter(p => Number.isFinite(p.vx)).map(p => p.vx)
		const yFinite = rawPoints.filter(p => Number.isFinite(p.vy)).map(p => p.vy)

		const xBounds = computeAxisBounds(xFinite)
		const yBounds = computeAxisBounds(yFinite)

		const data = rawPoints.map(p => ({
			value: [
				scaleValue(p.vx, xBounds, false),
				scaleValue(p.vy, yBounds, logScale),
				p.tr.symbol,
				p.tr.profit,
				p.vx,
				p.vy,
			] as unknown as number[],
			itemStyle: {
				color: p.tr.profit >= 0 ? profitColor : lossColor,
				opacity: 0.7,
			},
		}))

		const { buildScatter2DDataZoom } = useChartAxis()
		const dataZoom = buildScatter2DDataZoom(showScrollX, showScrollY)

		return {
			...base,
			tooltip: buildTooltipBlock((params: EChartsFormatterParams | EChartsFormatterParams[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const d = p.data as { value: number[] }
				const rp = rawPoints.find(rp => rp.tr.symbol === d.value[2] && rp.vx === d.value[4] && rp.vy === d.value[5])
				const tr = rp?.tr
				if (!tr) return ''
				const dateStr = tr.openDate.toLocaleDateString()
				const timeStr = tr.openDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
				const pnl = displayModeNet ? tr.netProfit : tr.profit
				// Lignes de base : date, ticker, P&L (P&L toujours affiché)
				const alreadyShown = new Set<TradeTooltipField>(['pnl'])
				const lines = [
					`${dateStr} ${timeStr}`,
					`${t('components.dashboard.breakdown.dimensions.ticker')}: ${tr.symbol}`,
					`${t('components.dashboard.breakdown.trade_property.pnl')}: ${formatCurrency(pnl)}`,
				]
				// Ajoute les propriétés sélectionnées dans le menu tooltip
				for (const field of selectedTooltipMetrics) {
					if (alreadyShown.has(field)) continue
					const line = formatTradeTooltipField(tr, field, t, rp?.duration)
					if (line) lines.push(line)
				}
				return lines.join('<br/>')
			}),
			grid,
			dataZoom,
			xAxis: {
				type: 'value',
				min: xBounds.axisMin,
				max: xBounds.axisMax,
				interval: splitInterval(xBounds.axisMin, xBounds.axisMax),
				name: t(`components.dashboard.breakdown.trade_property.${propX}`),
				nameLocation: 'middle',
				nameGap: 28,
				nameTextStyle: { color: textColor, fontSize: 11 },
				axisLine: { lineStyle: { color: axisColor } },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 11, formatter: (v: number) => formatTradePropertyValue(v, propX) },
				splitLine: { lineStyle: { color: axisColor } },
			},
			yAxis: {
				type: 'value',
				min: yBounds.axisMin,
				max: yBounds.axisMax,
				interval: splitInterval(yBounds.axisMin, yBounds.axisMax),
				name: t(`components.dashboard.breakdown.trade_property.${propY}`),
				nameLocation: 'middle',
				nameGap: 50,
				nameTextStyle: { color: textColor, fontSize: 11 },
				axisLine: { lineStyle: { color: axisColor } },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 11, formatter: (v: number) => formatTradePropertyValue(v, propY) },
				splitLine: { lineStyle: { color: axisColor } },
			},
			series: [{
				type: 'scatter',
				data,
				symbolSize: 8,
				emphasis: {
					focus: 'series',
					itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.3)' },
				},
			}] as SeriesOption[],
		}
	}

	const buildHeatmapChartOption = (config: {
		cells: HeatmapCell2D[]
		dimensionX: BreakdownDimension
		dimensionY: BreakdownDimension
		metric: BreakdownMetric
		selectedTooltipMetrics: BreakdownMetric[]
		heatmapColors: { min: string; max: string }
		isDark: boolean
	}): EChartsOption => {
		const { cells, dimensionX, dimensionY, metric, selectedTooltipMetrics, heatmapColors, isDark } = config

		const xKeys = sortDimensionKeys(Array.from(new Set(cells.map(c => c.keyX))), dimensionX)
		const yKeys = sortDimensionKeys(Array.from(new Set(cells.map(c => c.keyY))), dimensionY)

		const xLabels = xKeys.map(k => formatDimensionLabel(dimensionX, k))
		const yLabels = yKeys.map(k => formatDimensionLabel(dimensionY, k))

		const xLabelMap = new Map<string, number>(xKeys.map((k, i) => [k, i]))
		const yLabelMap = new Map<string, number>(yKeys.map((k, i) => [k, i]))

		const data = cells.map(c => {
			const xi = xLabelMap.get(c.keyX) ?? 0
			const yi = yLabelMap.get(c.keyY) ?? 0
			const val = getMetricValueForMetric(c.metrics, metric)
			return [xi, yi, val] as [number, number, number]
		})

		const maxAbs = Math.max(...data.map(d => Math.abs(d[2])), 1)

		const ctx = getChartContext()
		const { base, axisColor, textColor } = ctx

		return {
			...base,
			tooltip: buildTooltipBlock((params: EChartsFormatterParams | EChartsFormatterParams[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const [xi, yi, val] = p.value as unknown as [number, number, number]
				const xLabel = xLabels[xi] ?? ''
				const yLabel = yLabels[yi] ?? ''
				const cell = cells.find(c => xLabelMap.get(c.keyX) === xi && yLabelMap.get(c.keyY) === yi)
				const primaryLines = [`${t(`components.dashboard.breakdown.metrics.${metric}`)}: ${formatMetricValueForMetric(val, metric)}`]
				return buildTooltipLines(`${yLabel} × ${xLabel}`, primaryLines, cell?.metrics, new Set([metric]), selectedTooltipMetrics, t)
			}),
			grid: { left: 60, right: 16, top: 12, bottom: 28 },
			xAxis: {
				type: 'category',
				data: xLabels,
				splitArea: { show: true },
				axisLine: { lineStyle: { color: axisColor } },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 10 },
				axisPointer: { show: false },
				splitLine: { show: false },
			},
			yAxis: {
				type: 'category',
				data: yLabels,
				inverse: true,
				splitArea: { show: true },
				axisLine: { lineStyle: { color: axisColor } },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 13 },
				splitLine: { show: false },
			},
			visualMap: {
				min: -maxAbs,
				max: maxAbs,
				calculable: true,
				orient: 'horizontal',
				left: 'center',
				bottom: 0,
				textStyle: { color: textColor, fontSize: 10 },
				inRange: {
					color: [heatmapColors.min, heatmapColors.max],
				},
				outOfRange: {
					color: isDark ? '#111827' : '#f3f4f6',
				},
				show: false,
			},
			series: [{
				type: 'heatmap',
				data,
				label: {
					show: false,
				},
				emphasis: {
					itemStyle: {
						shadowBlur: 10,
						shadowColor: 'rgba(0, 0, 0, 0.5)',
					},
				},
			}],
		}
	}

	const buildBoxplotChartOption = (config: {
		categories: string[]
		data: number[][]
		rawTrades: number[][]
		barColor: string
		isDark: boolean
	}): EChartsOption => {
		const { categories, data, rawTrades, barColor, isDark } = config

		const ctx = getChartContext({ left: 60, right: 16, top: 12, bottom: 60 })
		const { base, axisColor, textColor, grid } = ctx

		return {
			...base,
			tooltip: buildTooltipBlock((params: EChartsFormatterParams | EChartsFormatterParams[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const idx = p.dataIndex
				const cat = categories[idx] ?? ''
				const d = data[idx]
				if (!d) return ''
				const raw = rawTrades[idx] || []
				const lines = [
					`<strong>${cat}</strong>`,
					`${t('components.dashboard.breakdown.boxplot.min')}: ${formatMetricValueForMetric(d[0], 'pnl')}`,
					`${t('components.dashboard.breakdown.boxplot.q1')}: ${formatMetricValueForMetric(d[1], 'pnl')}`,
					`${t('components.dashboard.breakdown.boxplot.median')}: ${formatMetricValueForMetric(d[2], 'pnl')}`,
					`${t('components.dashboard.breakdown.boxplot.q3')}: ${formatMetricValueForMetric(d[3], 'pnl')}`,
					`${t('components.dashboard.breakdown.boxplot.max')}: ${formatMetricValueForMetric(d[4], 'pnl')}`,
					`${t('components.dashboard.breakdown.metrics.tradesCount')}: ${raw.length}`,
				]
				return lines.join('<br/>')
			}),
			grid,
			xAxis: {
				type: 'category',
				data: categories,
				axisLine: { lineStyle: { color: axisColor } },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 11, interval: 0, rotate: categories.length > 6 ? 30 : 0 },
				splitLine: { show: false },
			},
			yAxis: {
				type: 'value',
				name: t('components.dashboard.breakdown.metrics.pnl'),
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: { color: textColor, fontSize: 11, formatter: (v: number) => formatMetricValueForMetric(v, 'pnl') },
				splitLine: { lineStyle: { color: axisColor } },
				nameTextStyle: { color: textColor, fontSize: 11 },
			},
			series: [{
				type: 'boxplot',
				data,
				itemStyle: {
					color: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.25)',
					borderColor: barColor,
					borderWidth: 1.5,
				},
			}],
		}
	}

	const buildRadarChartOption = (config: {
		indicators: { name: string; max: number }[]
		values: number[][]
		names: string[]
		isDark: boolean
	}): EChartsOption => {
		const { indicators, values, names, isDark } = config

		const ctx = getChartContext()
		const { base, textColor } = ctx

		if (!indicators.length) return { ...base }

		const palette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

		return {
			...base,
			tooltip: buildTooltipBlock((params: EChartsFormatterParams | EChartsFormatterParams[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const idx = p.dataIndex
				const name = names[idx] ?? ''
				const vals = values[idx] || []
				const lines = [`<strong>${name}</strong>`]
				indicators.forEach((ind, i) => {
					const val = vals[i] ?? 0
					const metricKey = ['winrate', 'profitFactor', 'expectancy', 'pnl', 'tradesCount'][i]
					lines.push(`${ind.name}: ${formatMetricValueForMetric(val, metricKey as BreakdownMetric)}`)
				})
				return lines.join('<br/>')
			}),
			legend: {
				data: names,
				bottom: 0,
				textStyle: { color: textColor, fontSize: 10 },
				type: 'scroll',
			},
			radar: {
				indicator: indicators,
				center: ['50%', '50%'],
				radius: '60%',
				axisName: { color: textColor, fontSize: 10 },
				splitArea: { areaStyle: { color: isDark ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)'] : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.04)'] } },
				splitLine: { lineStyle: { color: isDark ? '#374151' : '#d1d5db' } },
				axisLine: { lineStyle: { color: isDark ? '#374151' : '#d1d5db' } },
			},
			series: [{
				type: 'radar',
				data: values.map((v, i) => ({
					value: v,
					name: names[i],
					areaStyle: { opacity: 0.1 },
					lineStyle: { color: palette[i % palette.length], width: 2 },
					itemStyle: { color: palette[i % palette.length] },
				})),
			}],
		}
	}

	return {
		buildBarChartOption,
		buildScatterChartOption,
		buildScatter2DChartOption,
		buildScatterTradesChartOption,
		buildHeatmapChartOption,
		buildBoxplotChartOption,
		buildRadarChartOption,
	}
}
