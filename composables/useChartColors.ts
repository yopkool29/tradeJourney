import type { BreakdownMetric } from '~/type'

// Catégories de métriques pour déterminer la logique de couleur
export type MetricCategory = 'monetary' | 'percent' | 'raw'

// Métriques monétaires : peuvent être positives ou négatives (vert/rouge)
const monetaryMetrics: BreakdownMetric[] = ['pnl', 'appt', 'avgWin', 'avgLoss', 'expectancy', 'drawdown', 'currentDrawdown']

// Métriques en pourcentage : toujours >= 0 (couleur uniforme)
const percentMetrics: BreakdownMetric[] = ['winrate']

// Métriques de valeur brute : toujours >= 0 (couleur uniforme)
const rawMetrics: BreakdownMetric[] = ['profitFactor', 'avgDuration', 'tradesCount']

export const getMetricCategory = (metric: BreakdownMetric): MetricCategory => {
	if (monetaryMetrics.includes(metric)) return 'monetary'
	if (percentMetrics.includes(metric)) return 'percent'
	return 'raw'
}

export const isMonetaryMetric = (metric: BreakdownMetric): boolean => getMetricCategory(metric) === 'monetary'

// Couleurs fixes (fallback non configurable, accessibles sans contexte Vue)
export const chartColors = {
	// Vert pour valeurs positives (Tailwind green-600, identique au titre "Trades Gagnants")
	profit: '#16a34a',
	// Rouge pour valeurs négatives (Tailwind red-600)
	loss: '#dc2626',
	// Neutre / breakeven
	neutral: '#9ca3af',
} as const

// Génère une couleur HSL sur un dégradé rouge → vert selon une valeur
// min = rouge (hue 0), max = vert (hue 120)
export const hslColorForValue = (val: number, min: number, max: number, saturation = 45, lightness = 55): string => {
	const range = max - min
	if (range <= 0) return `hsl(60, ${saturation}%, ${lightness}%)`
	const normalized = Math.max(0, Math.min(1, (val - min) / range))
	const hue = normalized * 120
	return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

// Génère une couleur HSL pour une métrique monétaire (dégradé rouge → vert basé sur la valeur)
export const monetaryColorForValue = (val: number, saturation = 45, lightness = 55): string => {
	let hue: number
	if (val <= -3) {
		hue = 0
	} else if (val <= 0) {
		hue = ((val + 3) / 3) * 30
	} else if (val <= 3) {
		hue = 30 + (val / 3) * 90
	} else {
		hue = 120
	}
	return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

// Génère une couleur HSL pour le winrate (rouge < 25% → orange 25-60% → vert > 60%)
export const winrateColor = (wr: number, saturation = 45, lightness = 55): string => {
	let hue: number
	if (wr <= 25) {
		hue = 0
	} else if (wr <= 60) {
		hue = ((wr - 25) / 35) * 30
	} else {
		hue = 30 + ((wr - 60) / 40) * 90
	}
	return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

// Génère une couleur HSL pour le profit factor (orange < 1 → dégradé 1-3 → vert > 3)
export const profitFactorColor = (pf: number, saturation = 45, lightness = 55): string => {
	const clamped = pf === Infinity ? 999 : pf
	let hue: number
	if (clamped < 1) {
		hue = 30
	} else if (clamped <= 3) {
		hue = 30 + ((clamped - 1) / 2) * 90
	} else {
		hue = 120
	}
	return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

// Composable pour accéder aux couleurs + thème actuel (à utiliser dans les composants Vue)
export const useChartColors = () => {
	const colorMode = useColorMode()
	const isDark = computed(() => colorMode.value === 'dark' || colorMode.value === 'dark-gold')

	return { chartColors, hslColorForValue, monetaryColorForValue, winrateColor, profitFactorColor, isMonetaryMetric, getMetricCategory, isDark, colorMode }
}
