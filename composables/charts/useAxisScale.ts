import type { ComputedRef } from 'vue'

// Bornes d'un axe calculées par computeAxisBounds
export type AxisBounds = {
	axisMin: number
	axisMax: number
	minVal: number
	maxVal: number
	step: number
	logMin: number
	logMinNeg: number
}

// Calcule les bornes d'un axe à partir des valeurs finies :
// - axisMin = minVal - step (avec un peu de padding)
// - axisMax = maxVal + step (avec un peu de padding)
// - step = (max - min) / 8 (pour 9 splitLines comme ECharts)
// - Pour les métriques positives, axisMin = 0 (pas de valeurs négatives)
// - Pour les métriques négatives, axisMax = 0
// logMin = log de la plus petite valeur > 0 (pour l'échelle log)
// logMinNeg = log de la valeur absolue de la plus grande valeur < 0
export const computeAxisBounds = (finiteVals: number[]): AxisBounds => {
	if (finiteVals.length === 0) return { axisMin: 0, axisMax: 1, minVal: 0, maxVal: 1, step: 1, logMin: 0, logMinNeg: 0 }
	const minVal = Math.min(...finiteVals)
	const maxVal = Math.max(...finiteVals)
	const step = (maxVal - minVal) / 8 || Math.abs(maxVal) || 1
	const allPositive = finiteVals.every(v => v >= 0)
	const allNegative = finiteVals.every(v => v <= 0)
	// Pour les métriques positives, axisMin = 0 (pas de valeurs négatives sur l'axe)
	const axisMin = allPositive ? 0 : minVal - step
	const axisMax = allNegative ? 0 : maxVal + step
	const positiveVals = finiteVals.filter(v => v > 0)
	const negativeVals = finiteVals.filter(v => v < 0)
	const logMin = positiveVals.length > 0 ? Math.log(Math.min(...positiveVals)) : 0
	const logMinNeg = negativeVals.length > 0 ? Math.log(Math.abs(Math.max(...negativeVals))) : 0
	return { axisMin, axisMax, minVal, maxVal, step, logMin, logMinNeg }
}

// scaleValue : clamp les valeurs extrêmes pour qu'elles restent dans les bornes de l'axe
// - Infinity → axisMax (clamp au bord supérieur)
// - -Infinity → axisMin (clamp au bord inférieur)
// - NaN → axisMin (clamp au bord inférieur, zone "vide")
// - Valeurs normales → retournées telles quelles (ECharts gère le positionnement)
export const scaleValue = (val: number, bounds: AxisBounds, _useLog: boolean): number => {
	const { axisMin, axisMax } = bounds
	if (val === Infinity || val === -Infinity) return axisMax
	if (isNaN(val)) return axisMin
	// Clamp aux bornes de l'axe pour éviter les débordements
	if (val > axisMax) return axisMax
	if (val < axisMin) return axisMin
	return val
}

// inverseScaleValue : retourne la valeur réelle correspondant à une position sur l'axe
// Avec l'approche simple, la position = la valeur réelle (pas de transformation)
export const inverseScaleValue = (pos: number, _bounds: AxisBounds, _useLog: boolean): number => {
	return pos
}

// Crée un formatter pour les labels de l'axe
// Retourne "∞" pour axisMax (zone infini) et une chaîne formatée sinon
export const makeAxisLabel = (bounds: AxisBounds, _useLog: boolean, formatFn: (v: number) => string) =>
	(v: number) => formatFn(v)

// Composable : gère le calcul des bornes et la transformation des valeurs
// pour un axe donné. Utilisable par BreakdownWidget (scatter 2D, bar, bar vertical)
// et potentiellement d'autres charts.
export const useAxisScale = (logScale: ComputedRef<boolean>) => {
	const computeBounds = (finiteVals: number[]): AxisBounds => computeAxisBounds(finiteVals)

	const scaleValues = (vals: number[], bounds: AxisBounds): number[] =>
		vals.map(v => scaleValue(v, bounds, logScale.value))

	const makeAxisLabelFormatter = (bounds: AxisBounds, formatFn: (v: number) => string) =>
		makeAxisLabel(bounds, logScale.value, formatFn)

	return {
		computeBounds,
		scaleValues,
		scaleValue: (val: number, bounds: AxisBounds) => scaleValue(val, bounds, logScale.value),
		inverseScaleValue: (pos: number, bounds: AxisBounds) => inverseScaleValue(pos, bounds, logScale.value),
		makeAxisLabelFormatter,
	}
}
