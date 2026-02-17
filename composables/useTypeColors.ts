import { defaultSettings } from '~/schema/user'

type ChartType = 'pnlBarChart' | 'cumulatedPnlChart' | 'apptChart' | 'plRatioChart' | 'winrateChart'

export const useTypeColors = (chartType?: ChartType) => {
    const userStore = useUserStore()
    const colorMode = useColorMode()

    const isDark = computed(() => colorMode.value === 'dark')

    // Colors for PnL Bar Chart (profit/loss/breakeven)
    const userChartColors = computed(() => {
        const userSettings = userStore.user?.settings_object?.chartColors
        if (userSettings?.pnlBarChart) {
            return userSettings.pnlBarChart
        }
        return defaultSettings.chartColors!.pnlBarChart
    })

    const profitColor = computed(() =>
        isDark.value ? userChartColors.value.profit.dark : userChartColors.value.profit.light
    )

    const lossColor = computed(() =>
        isDark.value ? userChartColors.value.loss.dark : userChartColors.value.loss.light
    )

    const breakevenColor = computed(() =>
        isDark.value ? userChartColors.value.breakeven.dark : userChartColors.value.breakeven.light
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
        isDark.value ? specificChartColors.value.bar?.dark : specificChartColors.value.bar?.light
    )

    const pointColor = computed(() =>
        isDark.value ? specificChartColors.value.point?.dark : specificChartColors.value.point?.light
    )

    const movingAverageColor = computed(() =>
        isDark.value ? specificChartColors.value.movingAverage?.dark : specificChartColors.value.movingAverage?.light
    )

    const userBadgeColors = computed(() => {
        const userSettings = userStore.user?.settings_object?.chartColors
        if (userSettings?.tradeTypeBadges) {
            return userSettings.tradeTypeBadges
        }
        return defaultSettings.chartColors!.tradeTypeBadges!
    })

    const buyColor = computed(() =>
        isDark.value ? userBadgeColors.value.buy.dark : userBadgeColors.value.buy.light
    )

    const sellColor = computed(() =>
        isDark.value ? userBadgeColors.value.sell.dark : userBadgeColors.value.sell.light
    )

    const tradeTypeColors = computed(() => ({
        buy: buyColor.value,
        sell: sellColor.value,
    }))

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
