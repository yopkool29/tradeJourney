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
// - 0% = 0 ou vide (NaN)
// - 10% = min des valeurs finies
// - 90% = max des valeurs finies
// - 100% = infini (ou valeurs au-delà de max + 1 step)
// - step = (max - min) / 8 (constant entre 10% et 90%)
// logMin = log de la plus petite valeur > 0 (pour l'échelle log)
// logMinNeg = log de la valeur absolue de la plus grande valeur < 0
export const computeAxisBounds = (finiteVals: number[]): AxisBounds => {
	if (finiteVals.length === 0) return { axisMin: 0, axisMax: 1, minVal: 0, maxVal: 1, step: 1, logMin: 0, logMinNeg: 0 }
	const minVal = Math.min(...finiteVals)
	const maxVal = Math.max(...finiteVals)
	const step = (maxVal - minVal) / 8 || Math.abs(maxVal) || 1
	const allPositive = finiteVals.every(v => v >= 0)
	const allNegative = finiteVals.every(v => v <= 0)
	// Pour les métriques positives, 0% = 0 (pas de valeurs négatives sur l'axe)
	const axisMin = allPositive ? 0 : minVal - step
	const axisMax = allNegative ? 0 : maxVal + step
	const positiveVals = finiteVals.filter(v => v > 0)
	const negativeVals = finiteVals.filter(v => v < 0)
	const logMin = positiveVals.length > 0 ? Math.log(Math.min(...positiveVals)) : 0
	const logMinNeg = negativeVals.length > 0 ? Math.log(Math.abs(Math.max(...negativeVals))) : 0
	return { axisMin, axisMax, minVal, maxVal, step, logMin, logMinNeg }
}

// scaleValue : transforme une valeur réelle en position sur l'axe
// - Infinity → axisMax (100%, zone "infini")
// - NaN → axisMin (0%, zone "vide" — pas de donnée)
// - 0 → zone normale (vraie valeur, ex: PF=0 = que des pertes)
// - Entre minVal et maxVal → interpolation LOG (si useLog) ou linéaire (10%-90%)
// - Entre maxVal et maxVal+step → 90%-100%
// - Au-delà de maxVal+step → axisMax (100%, comme infini)
// - Entre minVal-step et minVal → 0%-10%
// - En-dessous de minVal-step → axisMin (0%, comme vide)
export const scaleValue = (val: number, bounds: AxisBounds, useLog: boolean): number => {
	const { axisMin, axisMax, minVal, maxVal, step, logMin, logMinNeg } = bounds
	// Infinity → 100% (zone "infini")
	if (val === Infinity || val === -Infinity) return axisMax
	// NaN = vide (pas de donnée) → 0%
	if (isNaN(val)) return axisMin
	if (val > maxVal + step) return axisMax
	if (val < minVal - step) return axisMin

	const displayLower = axisMin + (axisMax - axisMin) * 0.1
	const displayUpper = axisMin + (axisMax - axisMin) * 0.9
	const range = displayUpper - displayLower

	// Zone d'overflow au-dessus de maxVal (90%-100%)
	if (val > maxVal) {
		const ratio = (val - maxVal) / step
		return displayUpper + ratio * (axisMax - displayUpper)
	}
	// Zone d'overflow en-dessous de minVal (0%-10%)
	if (val < minVal) {
		const ratio = (minVal - val) / step
		return axisMin + (1 - ratio) * (displayLower - axisMin)
	}

	// Entre minVal et maxVal → interpolation (10%-90%)
	const ratio = (val - minVal) / (maxVal - minVal || 1)
	if (useLog && minVal >= 0 && maxVal > 0) {
		const logMax = Math.log(maxVal)
		const logVal = Math.log(Math.max(val, Math.exp(logMin)))
		const logRatio = (logVal - logMin) / (logMax - logMin || 1)
		return displayLower + logRatio * range
	}
	if (useLog && minVal < 0 && maxVal <= 0) {
		const logMax = Math.log(Math.abs(minVal))
		const logVal = Math.log(Math.abs(val))
		const logRatio = (logVal - logMinNeg) / (logMax - logMinNeg || 1)
		return displayLower + logRatio * range
	}
	return displayLower + ratio * range
}

// inverseScaleValue : inverse la transformation de scaleValue
// Prend une position sur l'axe et retourne la valeur réelle correspondante
// Utilisé pour afficher les labels de l'axe selon la même échelle que les points
export const inverseScaleValue = (pos: number, bounds: AxisBounds, useLog: boolean): number => {
	const { axisMin, axisMax, minVal, maxVal, step, logMin, logMinNeg } = bounds
	const displayLower = axisMin + (axisMax - axisMin) * 0.1
	const displayUpper = axisMin + (axisMax - axisMin) * 0.9
	if (pos <= axisMin) return NaN
	if (pos >= axisMax) return Infinity
	// Zone d'overflow au-dessus de maxVal (90%-100%)
	if (pos > displayUpper) {
		const ratio = (pos - displayUpper) / (axisMax - displayUpper)
		return maxVal + ratio * step
	}
	// Zone d'overflow en-dessous de minVal (0%-10%)
	// Si toutes les valeurs sont positives (minVal >= 0), ne pas afficher de labels négatifs
	if (pos < displayLower) {
		if (minVal >= 0) return NaN // zone "vide" : pas de label pour les métriques positives
		const ratio = (displayLower - pos) / (displayLower - axisMin)
		return minVal - ratio * step
	}
	// Entre displayLower et displayUpper → inverse du log ou linéaire
	const range = displayUpper - displayLower
	const ratio = (pos - displayLower) / (range || 1)
	if (useLog && minVal >= 0 && maxVal > 0) {
		const logMax = Math.log(maxVal)
		return Math.exp(logMin + ratio * (logMax - logMin))
	}
	if (useLog && minVal < 0 && maxVal <= 0) {
		const logMax = Math.log(Math.abs(minVal))
		return -Math.exp(logMinNeg + ratio * (logMax - logMinNeg))
	}
	return minVal + ratio * (maxVal - minVal)
}

// Crée un formatter pour les labels de l'axe
// Retourne une chaîne vide pour les valeurs NaN (zone "vide") et "∞" pour Infinity
export const makeAxisLabel = (bounds: AxisBounds, useLog: boolean, formatFn: (v: number) => string) =>
	(v: number) => {
		const realVal = inverseScaleValue(v, bounds, useLog)
		if (isNaN(realVal)) return ''
		if (realVal === Infinity) return '∞'
		return formatFn(realVal)
	}

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
