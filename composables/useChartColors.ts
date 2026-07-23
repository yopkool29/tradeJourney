import { useColorMode } from '#imports'

// Couleurs fixes pour métriques spécifiques (accessibles sans contexte Vue)
export const chartColors = {
	// Vert pour valeurs positives (identique au titre "Trades Gagnants" = Tailwind green-600)
	profit: '#16a34a',
	// Rouge pour valeurs négatives (Tailwind red-600)
	loss: '#dc2626',
	// Bleu pour avgDuration
	avgDuration: '#3b82f6',
	// Vert pour tradesCount (Tailwind green-500)
	tradesCount: '#22c55e',
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

// Composable pour accéder aux couleurs + thème actuel (à utiliser dans les composants Vue)
export const useChartColors = () => {
	const colorMode = useColorMode()
	const isDark = computed(() => colorMode.value === 'dark' || colorMode.value === 'dark-gold')

	return { chartColors, hslColorForValue, isDark, colorMode }
}

