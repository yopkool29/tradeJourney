import type { ComputedRef } from 'vue'
import { computeAxisBounds, scaleValue, inverseScaleValue, makeAxisLabel } from '~/utils/dashboard'
import type { AxisBounds } from '~/utils/dashboard'

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
