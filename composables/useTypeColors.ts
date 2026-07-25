import { defaultSettings } from '~/schema/user'

type ChartType = 'pnlBarChart' | 'timeSeriesChart'
type ThemeKey = 'light' | 'dark' | 'light-blue' | 'dark-gold'

// Helper to get color for current theme with fallback
const getThemeColor = (colors: Record<ThemeKey, string>, theme: string): string => {
    const validThemes: ThemeKey[] = ['light', 'dark', 'light-blue', 'dark-gold']
    const themeKey = validThemes.includes(theme as ThemeKey) ? (theme as ThemeKey) : 'light'

    // If theme exists, return it
    if (colors[themeKey]) {
        return colors[themeKey]
    }

    // Fallback for missing themes in old user data
    const fallbacks: Record<ThemeKey, ThemeKey> = {
        'light': 'light',
        'dark': 'dark',
        'light-blue': 'light',
        'dark-gold': 'dark'
    }
    const fallbackKey = fallbacks[themeKey]
    return colors[fallbackKey] || colors['light'] || '#000000'
}

export const useTypeColors = (chartType?: ChartType) => {
    const userStore = useUserStore()
    const colorMode = useColorMode()

    // Colors for PnL Bar Chart (profit/loss/breakeven)
    const userChartColors = computed(() => {
        const userSettings = userStore.user?.settings_object?.chartColors
        if (userSettings?.pnlBarChart) {
            return userSettings.pnlBarChart
        }
        return defaultSettings.chartColors!.pnlBarChart
    })

    const profitColor = computed(() =>
        getThemeColor(userChartColors.value.profit as Record<ThemeKey, string>, colorMode.value)
    )

    const lossColor = computed(() =>
        getThemeColor(userChartColors.value.loss as Record<ThemeKey, string>, colorMode.value)
    )

    const breakevenColor = computed(() =>
        getThemeColor(userChartColors.value.breakeven as Record<ThemeKey, string>, colorMode.value)
    )

    // Specific chart colors (bar, point, movingAverage, rawMetric) based on chart type
    // Fusionne les settings utilisateur avec les defaults pour les champs manquants
    const specificChartColors = computed(() => {
        const userSettings = userStore.user?.settings_object?.chartColors
        const type = chartType || 'pnlBarChart'
        const defaults = defaultSettings.chartColors![type]

        if (userSettings?.[type]) {
            return { ...defaults, ...userSettings[type] }
        }
        return defaults
    })

    const barColor = computed(() =>
        specificChartColors.value.bar ? getThemeColor(specificChartColors.value.bar as Record<ThemeKey, string>, colorMode.value) : undefined
    )

    const pointColor = computed(() =>
        specificChartColors.value.point ? getThemeColor(specificChartColors.value.point as Record<ThemeKey, string>, colorMode.value) : undefined
    )

    const movingAverageColor = computed(() =>
        specificChartColors.value.movingAverage ? getThemeColor(specificChartColors.value.movingAverage as Record<ThemeKey, string>, colorMode.value) : undefined
    )

    const rawMetricColor = computed(() =>
        specificChartColors.value.rawMetric ? getThemeColor(specificChartColors.value.rawMetric as Record<ThemeKey, string>, colorMode.value) : undefined
    )

    // Heatmap colors (min/max gradient)
    const heatmapColors = computed(() => {
        const userSettings = userStore.user?.settings_object?.chartColors
        const settings = userSettings?.heatmap || defaultSettings.chartColors!.heatmap!
        return {
            min: getThemeColor(settings.min as Record<ThemeKey, string>, colorMode.value),
            max: getThemeColor(settings.max as Record<ThemeKey, string>, colorMode.value),
        }
    })

    // Scatter 2D colors (min/mid/max gradient)
    const scatter2DColors = computed(() => {
        const userSettings = userStore.user?.settings_object?.chartColors
        const settings = userSettings?.scatter2D || defaultSettings.chartColors!.scatter2D!
        return {
            min: getThemeColor(settings.min as Record<ThemeKey, string>, colorMode.value),
            mid: getThemeColor(settings.mid as Record<ThemeKey, string>, colorMode.value),
            max: getThemeColor(settings.max as Record<ThemeKey, string>, colorMode.value),
        }
    })

    const userBadgeColors = computed(() => {
        const userSettings = userStore.user?.settings_object?.chartColors
        if (userSettings?.tradeTypeBadges) {
            return userSettings.tradeTypeBadges
        }
        return defaultSettings.chartColors!.tradeTypeBadges!
    })

    const buyColor = computed(() =>
        getThemeColor(userBadgeColors.value.buy as Record<ThemeKey, string>, colorMode.value)
    )

    const sellColor = computed(() =>
        getThemeColor(userBadgeColors.value.sell as Record<ThemeKey, string>, colorMode.value)
    )

    const tradeTypeColors = computed(() => ({
        buy: buyColor.value,
        sell: sellColor.value,
    }))

    const isDark = useIsDark()

    return { 
        tradeTypeColors,
        profitColor,
        lossColor,
        breakevenColor,
        barColor,
        pointColor,
        movingAverageColor,
        rawMetricColor,
        heatmapColors,
        scatter2DColors,
        userChartColors,
        isDark
    }
}
