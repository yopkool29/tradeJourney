import { chartColors, hslColorForValue, monetaryColorForValue, winrateColor, profitFactorColor, isMonetaryMetric, getMetricCategory } from '~/utils/dashboard'

export { type MetricCategory, getMetricCategory, isMonetaryMetric, chartColors, hslColorForValue, monetaryColorForValue, winrateColor, profitFactorColor } from '~/utils/dashboard'

// Composable pour accéder aux couleurs + thème actuel (à utiliser dans les composants Vue)
export const useChartColors = () => {
	const colorMode = useColorMode()
	const isDark = computed(() => colorMode.value === 'dark' || colorMode.value === 'dark-gold')

	return { chartColors, hslColorForValue, monetaryColorForValue, winrateColor, profitFactorColor, isMonetaryMetric, getMetricCategory, isDark, colorMode }
}
