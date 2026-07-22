import { defaultSettings } from '~/schema/user'

type ChartType = 'pnlBarChart' | 'cumulatedPnlChart' | 'timeSeriesChart'
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

    // Specific chart colors (bar, point, movingAverage) based on chart type
    const specificChartColors = computed(() => {
        const userSettings = userStore.user?.settings_object?.chartColors
        const type = chartType || 'pnlBarChart'
        
        if (userSettings?.[type]) {
            return userSettings[type]
        }
        return defaultSettings.chartColors![type]
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
        userChartColors,
        isDark
    }
}
