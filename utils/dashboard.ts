import type {
    EChartsOption,
    LineSeriesOption,
    ScatterSeriesOption,
    HeatmapSeriesOption,
    VisualMapComponentOption,
} from 'echarts'
import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
} from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { isBreakdownKey } from '~/type'
import type {
    BreakdownDimension,
    BreakdownMetric,
    TradeTooltipField,
} from '~/type'
import type { TradeType, TradeExtendedType } from '~/schema/trade'
import type { SettingsContentType } from '~/schema/user'
import {
    getTimeZoneFromSettings,
    formatDateKeyForGrouping,
} from '~/utils/date-utils'
import {
    getPNL,
    getAPPT,
    getWinrate,
    movingAverage,
    getPLRatio as calculatePLRatio,
} from './tradeStats'
import { round as _round } from './index'
import { formatCurrency } from '~/utils'

// --- Grid layout ---

export interface GridTemplateItem {
    w: number
    h: number
    i: string
}

export const defaultGridItemsLg: GridTemplateItem[] = [
    { w: 6, h: 6, i: 'timeSeries_defaultPnlByTrade' },
    { w: 6, h: 6, i: 'timeSeries_defaultCumulatedPnl' },
    { w: 6, h: 6, i: 'timeSeries_defaultAppt' },
    { w: 6, h: 6, i: 'timeSeries_defaultWinrate' },
    { w: 3, h: 12, i: 'allTrades' },
    { w: 3, h: 12, i: 'profitTrades' },
    { w: 3, h: 12, i: 'losingTrades' },
    { w: 3, h: 7, i: 'winLossComparison' },
    { w: 3, h: 6, i: 'riskRatios' },
    { w: 6, h: 8, i: 'dayStatistics' },
    { w: 6, h: 6, i: 'breakdownHeatmap_defaultHourDay' },
    { w: 6, h: 6, i: 'breakdownBarVertical_defaultWinrateByHour' },
    { w: 6, h: 6, i: 'breakdownBarVertical_defaultPnlByDayOfWeek' },
]

export const defaultGridItemsMd: GridTemplateItem[] = [
    { w: 6, h: 6, i: 'timeSeries_defaultPnlByTrade' },
    { w: 6, h: 6, i: 'timeSeries_defaultCumulatedPnl' },
    { w: 6, h: 6, i: 'timeSeries_defaultAppt' },
    { w: 6, h: 6, i: 'timeSeries_defaultWinrate' },
    { w: 3, h: 12, i: 'allTrades' },
    { w: 3, h: 12, i: 'profitTrades' },
    { w: 3, h: 12, i: 'losingTrades' },
    { w: 3, h: 8, i: 'winLossComparison' },
    { w: 3, h: 10, i: 'riskRatios' },
    { w: 6, h: 8, i: 'dayStatistics' },
    { w: 6, h: 6, i: 'breakdownHeatmap_defaultHourDay' },
    { w: 6, h: 6, i: 'breakdownBarVertical_defaultWinrateByHour' },
    { w: 3, h: 6, i: 'breakdownBarVertical_defaultPnlByDayOfWeek' },
]

export const defaultGridItemsSm: GridTemplateItem[] = [
    { w: 3, h: 6, i: 'timeSeries_defaultPnlByTrade' },
    { w: 3, h: 6, i: 'timeSeries_defaultCumulatedPnl' },
    { w: 3, h: 6, i: 'timeSeries_defaultAppt' },
    { w: 3, h: 6, i: 'timeSeries_defaultWinrate' },
    { w: 3, h: 12, i: 'allTrades' },
    { w: 3, h: 12, i: 'profitTrades' },
    { w: 3, h: 12, i: 'losingTrades' },
    { w: 3, h: 8, i: 'winLossComparison' },
    { w: 3, h: 10, i: 'riskRatios' },
    { w: 6, h: 8, i: 'dayStatistics' },
    { w: 3, h: 6, i: 'hourlyHeatmap' },
    { w: 3, h: 6, i: 'breakdownBarVertical_defaultWinrateByHour' },
    { w: 3, h: 6, i: 'breakdownBarVertical_defaultPnlByDayOfWeek' },
]

const compactItems = (items: GridTemplateItem[], cols: number) => {
    let currentX = 0
    let currentY = 0
    let rowHeight = 0
    return items.map((item) => {
        if (currentX + item.w > cols) {
            currentX = 0
            currentY += rowHeight
            rowHeight = 0
        }
        const positioned = { ...item, x: currentX, y: currentY }
        currentX += item.w
        rowHeight = Math.max(rowHeight, item.h)
        return positioned
    })
}

export const defaultDashboardGridLayout = compactItems(defaultGridItemsLg, 12)
export const defaultDashboardGridLayoutMd = compactItems(defaultGridItemsMd, 6)
export const defaultDashboardGridLayoutSm = compactItems(defaultGridItemsSm, 3)

// Items that can be resized in the grid layout
// Les items breakdown sont resizable — on détecte par préfixe au runtime
// (les clés sont dynamiques : breakdownBar_abc_123...)
export const isResizableItem = (itemId: string): boolean => {
    if (resizableGridItems.includes(itemId)) return true
    return isBreakdownKey(itemId)
}

export const resizableGridItems = [
    'allTrades',
    'profitTrades',
    'losingTrades',
    'winLossComparison',
    'riskRatios',
    'dayStatistics',
]

// --- Périodes ---

export const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear =
        (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

export const formatDateByMode = (
    period: string,
    mode: string,
    longDate = false
): string => {
    const date = new Date(period)
    switch (mode) {
        case 'day': {
            const options: Intl.DateTimeFormatOptions = {
                day: 'numeric',
                month: 'numeric',
            }
            if (longDate) {
                options.year = 'numeric'
            }
            return date.toLocaleDateString('fr-FR', options)
        }
        case 'week': {
            const options: Intl.DateTimeFormatOptions = {
                day: 'numeric',
                month: 'numeric',
            }
            if (longDate) {
                options.year = 'numeric'
            }
            return `S${getWeekNumber(date)} ${date.toLocaleDateString('fr-FR', options)}`
        }
        case 'month': {
            return date.toLocaleDateString('fr-FR', {
                month: 'short',
                year: 'numeric',
            })
        }
        case 'year': {
            return date.getFullYear().toString()
        }
        default: {
            return period
        }
    }
}

export const periodTranslations = {
    custom: { en: 'Custom', fr: 'Personnaliser', includeEndDay: true },
    this_week: { en: 'This Week', fr: 'Cette Semaine', includeEndDay: true },
    last_week: {
        en: 'Last Week',
        fr: 'La Semaine Dernière',
        includeEndDay: false,
    },
    last_week_until_now: {
        en: 'Last Week Until Now',
        fr: "La Semaine Dernière Jusqu'à  Maintenant",
        includeEndDay: true,
    },
    last_two_weeks: {
        en: 'Last Two Weeks',
        fr: 'Les Deux Dernières Semaines',
        includeEndDay: false,
    },
    last_two_weeks_until_now: {
        en: 'Last Two Weeks Until Now',
        fr: "Les Deux Dernières Semaines Jusqu'à Maintenant",
        includeEndDay: true,
    },
    this_month: { en: 'This Month', fr: 'Ce Mois', includeEndDay: true },
    last_month: {
        en: 'Last Month',
        fr: 'Le Mois Dernier',
        includeEndDay: false,
    },
    last_month_until_now: {
        en: 'Last Month Until Now',
        fr: "Le Mois Dernier Jusqu'à Maintenant",
        includeEndDay: true,
    },
    last_two_months: {
        en: 'Last Two Months',
        fr: 'Les Deux Derniers Mois',
        includeEndDay: false,
    },
    last_two_months_until_now: {
        en: 'Last Two Months Until Now',
        fr: "Les Deux Derniers Mois Jusqu'à Maintenant",
        includeEndDay: true,
    },
    last_three_months: {
        en: 'Last Three Months',
        fr: 'Les Trois Derniers Mois',
        includeEndDay: false,
    },
    last_three_months_until_now: {
        en: 'Last Three Months Until Now',
        fr: "Les Trois Derniers Mois Jusqu'à Maintenant",
        includeEndDay: true,
    },
    this_year: { en: 'This Year', fr: 'Cette Année', includeEndDay: true },
    last_year: {
        en: 'Last Year',
        fr: "L'Année Dernière",
        includeEndDay: false,
    },
}

export const periodOptions = (local = 'fr') => {
    return Object.entries(periodTranslations).map(([value, { fr, en }]) => ({
        label: local == 'fr' ? fr : en,
        value,
    }))
}

export const getPeriodDates = (period: string) => {
    const today = new Date()
    switch (period) {
        case 'this_week':
            return {
                start: startOfWeek(today, { weekStartsOn: 1 }),
                end: endOfWeek(today, { weekStartsOn: 1 }),
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        case 'last_week': {
            const ref = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return {
                start: startOfWeek(ref, { weekStartsOn: 1 }),
                end: endOfWeek(ref, { weekStartsOn: 1 }),
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        }
        case 'last_week_until_now': {
            const ref = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return {
                start: startOfWeek(ref, { weekStartsOn: 1 }),
                end: today,
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        }
        case 'last_two_weeks': {
            const refStart = new Date(
                today.getTime() - 14 * 24 * 60 * 60 * 1000
            )
            const refEnd = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return {
                start: startOfWeek(refStart, { weekStartsOn: 1 }),
                end: endOfWeek(refEnd, { weekStartsOn: 1 }),
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        }
        case 'last_two_weeks_until_now': {
            const ref = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
            return {
                start: startOfWeek(ref, { weekStartsOn: 1 }),
                end: today,
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        }
        case 'this_month':
            return {
                start: startOfMonth(today),
                end: endOfMonth(today),
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        case 'last_month': {
            const ref = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            return {
                start: startOfMonth(ref),
                end: endOfMonth(ref),
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        }
        case 'last_month_until_now': {
            const ref = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            return {
                start: startOfMonth(ref),
                end: today,
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        }
        case 'last_two_months': {
            const refStart = new Date(
                today.getFullYear(),
                today.getMonth() - 2,
                1
            )
            const refEnd = new Date(
                today.getFullYear(),
                today.getMonth() - 1,
                1
            )
            return {
                start: startOfMonth(refStart),
                end: endOfMonth(refEnd),
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        }
        case 'last_two_months_until_now': {
            const ref = new Date(today.getFullYear(), today.getMonth() - 2, 1)
            return {
                start: startOfMonth(ref),
                end: today,
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        }
        case 'last_three_months': {
            const refStart = new Date(
                today.getFullYear(),
                today.getMonth() - 3,
                1
            )
            const refEnd = new Date(
                today.getFullYear(),
                today.getMonth() - 1,
                1
            )
            return {
                start: startOfMonth(refStart),
                end: endOfMonth(refEnd),
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        }
        case 'last_three_months_until_now': {
            const ref = new Date(today.getFullYear(), today.getMonth() - 3, 1)
            return {
                start: startOfMonth(ref),
                end: today,
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        }
        case 'this_year': {
            return {
                start: startOfYear(today),
                end: endOfYear(today),
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        }
        case 'last_year': {
            const ref = new Date(today.getFullYear() - 1, 0, 1)
            return {
                start: startOfYear(ref),
                end: endOfYear(ref),
                includeEndDay: periodTranslations[period].includeEndDay,
            }
        }
        case 'all':
        default:
            return { start: null, end: null, includeEndDay: false }
    }
}

// Groupe les trades par période (jour, semaine, mois, année)
export const groupTradesByPeriod = (
    trades: TradeType[],
    mode: 'day' | 'week' | 'month' | 'year',
    settings: Partial<SettingsContentType> | null
) => {
    const sortedTrades = [...trades].sort((a, b) => {
        const dateA = new Date(a.closeDate)
        const dateB = new Date(b.closeDate)
        return dateA.getTime() - dateB.getTime()
    })

    const timezoneMode = settings?.timezoneDisplay ?? 'CURRENT'
    const timezoneLocal = settings?.timezoneLocal ?? 'Europe/Paris'
    const timezoneUtcOffset = settings?.timezoneUtcOffset ?? 0

    const groupedTrades: Record<string, TradeType[]> = {}

    sortedTrades.forEach((trade) => {
        const closeDate = new Date(trade.closeDate)
        let key: string

        switch (mode) {
            case 'day':
                key = formatDateKeyForGrouping(
                    closeDate,
                    'day',
                    timezoneMode,
                    timezoneLocal,
                    timezoneUtcOffset
                )
                break
            case 'week': {
                const timeZone = getTimeZoneFromSettings(
                    timezoneMode,
                    timezoneLocal,
                    timezoneUtcOffset
                )
                const zonedDate = toZonedTime(closeDate, timeZone)
                const monday = startOfWeek(zonedDate, { weekStartsOn: 1 })
                key = formatDateKeyForGrouping(
                    fromZonedTime(monday, timeZone),
                    'day',
                    timezoneMode,
                    timezoneLocal,
                    timezoneUtcOffset
                )
                break
            }
            case 'month':
                key = formatDateKeyForGrouping(
                    closeDate,
                    'month',
                    timezoneMode,
                    timezoneLocal,
                    timezoneUtcOffset
                )
                break
            case 'year':
                key = `${closeDate.getFullYear()}`
                break
        }

        if (!groupedTrades[key]) {
            groupedTrades[key] = []
        }
        groupedTrades[key].push(trade)
    })

    return groupedTrades
}

// --- Générateurs de données pour les charts ---

// Génère les données pour un graphique d'évolution du PnL intraday
export const generateIntradayPnlChartData = (
    trades: TradeType[]
): Array<{ count: number; pnl: number; date?: Date }> => {
    if (!trades || trades.length === 0) return []

    let cumulativePnl = 0
    let count = 0
    const dataPoints: Array<{ count: number; pnl: number; date?: Date }> =
        trades.map((trade) => {
            cumulativePnl += trade.profit || 0
            count++
            return {
                count,
                date: trade.closeDate,
                pnl: parseFloat(cumulativePnl.toFixed(2)),
            }
        })

    if (dataPoints.length > 0) {
        dataPoints.unshift({ count: 0, date: undefined, pnl: 0 })
    }

    return dataPoints
}

// Génère les données pour le graphique de PnL cumulé
export const generateCumulatedPnlChartData = (
    trades: TradeType[],
    mode: 'day' | 'week' | 'month' | 'year',
    useNet: boolean,
    settings: Partial<SettingsContentType> | null,
    preGroupedTrades?: Record<string, TradeType[]>
) => {
    if (!trades || trades.length === 0) {
        return {
            labels: [],
            datasets: [
                {
                    type: 'line' as const,
                    label: 'Cumulé',
                    data: [],
                    borderColor: '',
                    backgroundColor: '',
                    fill: false,
                    tension: 0.2,
                    pointRadius: 4,
                    pointBackgroundColor: [],
                    pointBorderColor: [],
                    pointBorderWidth: 2,
                    yAxisID: 'y',
                },
                {
                    type: 'bar' as const,
                    label: 'PnL',
                    data: [],
                    backgroundColor: '',
                    borderRadius: 4,
                    barPercentage: 0.6,
                },
            ],
        }
    }

    const groupedTrades =
        preGroupedTrades ?? groupTradesByPeriod(trades, mode, settings)
    const periods = Object.keys(groupedTrades).sort()

    const periodPnl = periods.map((period) =>
        getPNL(groupedTrades[period], 2, useNet)
    )

    const cumulatedPnl: number[] = []
    let cumulated = 0
    periodPnl.forEach((pnl) => {
        cumulated += pnl
        cumulatedPnl.push(cumulated)
    })

    const formattedLabels = periods.map((period) =>
        formatDateByMode(period, mode, false)
    )

    return {
        labels: formattedLabels,
        datasets: [
            {
                type: 'line' as const,
                label: 'Cumulé',
                data: cumulatedPnl,
                borderColor: '#facc15',
                backgroundColor: '#facc15',
                fill: false,
                tension: 0.2,
                pointRadius: 4,
                pointBackgroundColor: '#facc15',
                yAxisID: 'y',
            },
            {
                type: 'bar' as const,
                label: 'PnL',
                data: periodPnl,
                backgroundColor: '#38bdf8',
                borderRadius: 4,
                barPercentage: 0.6,
            },
        ],
    }
}

// Génère les données pour le graphique APPT
export const generateApptChartData = (
    trades: TradeType[],
    mode: 'day' | 'week' | 'month' | 'year',
    movingAvgWindow: number,
    useNet: boolean,
    settings: Partial<SettingsContentType> | null,
    preGroupedTrades?: Record<string, TradeType[]>
) => {
    if (!trades || trades.length === 0) {
        return {
            labels: [],
            datasets: [
                {
                    type: 'line' as const,
                    label: 'Moyenne mobile',
                    data: [],
                    borderColor: '#6366f1',
                    backgroundColor: '#6366f133',
                    fill: false,
                    tension: 0.2,
                    pointRadius: 3,
                    pointBackgroundColor: '#6366f1',
                    yAxisID: 'y',
                },
                {
                    type: 'bar' as const,
                    label: 'APPT',
                    data: [],
                    backgroundColor: '',
                    borderRadius: 4,
                    barPercentage: 0.6,
                },
            ],
        }
    }

    const groupedTrades =
        preGroupedTrades ?? groupTradesByPeriod(trades, mode, settings)
    const periods = Object.keys(groupedTrades).sort()

    const periodAppt = periods.map((period) =>
        getAPPT(groupedTrades[period], true, 2, useNet)
    )
    const formattedLabels = periods.map((period) =>
        formatDateByMode(period, mode)
    )
    const movingAverages = movingAverage(periodAppt, movingAvgWindow)

    return {
        labels: formattedLabels,
        datasets: [
            {
                type: 'line' as const,
                label: `Moyenne mobile (${movingAvgWindow})`,
                data: movingAverages,
                borderColor: '#6366f1',
                backgroundColor: '#6366f133',
                fill: false,
                tension: 0.2,
                pointRadius: 3,
                pointBackgroundColor: '#6366f1',
                yAxisID: 'y',
            },
            {
                type: 'bar' as const,
                label: 'APPT',
                data: periodAppt,
                backgroundColor: '#4ade80',
                borderRadius: 4,
                barPercentage: 0.6,
            },
        ],
    }
}

// Génère les données pour le graphique de P/L Ratio
export const generatePlRatioChartData = (
    trades: TradeType[],
    mode: 'day' | 'week' | 'month' | 'year',
    movingAvgWindow: number,
    settings: Partial<SettingsContentType> | null
) => {
    if (!trades || trades.length === 0) {
        return {
            labels: [],
            datasets: [
                {
                    type: 'line' as const,
                    label: 'Moyenne mobile',
                    data: [],
                    borderColor: '#6366f1',
                    backgroundColor: '#6366f133',
                    fill: false,
                    tension: 0.2,
                    pointRadius: 3,
                    pointBackgroundColor: '#6366f1',
                    yAxisID: 'y',
                },
                {
                    type: 'bar' as const,
                    label: 'P/L Ratio',
                    data: [],
                    backgroundColor: '#f59e0b',
                    borderRadius: 4,
                    barPercentage: 0.6,
                },
            ],
        }
    }

    const groupedTrades = groupTradesByPeriod(trades, mode, settings)
    const periods = Object.keys(groupedTrades).sort()

    const periodPlRatio = periods.map((period) =>
        calculatePLRatio(groupedTrades[period], 2)
    )
    const formattedLabels = periods.map((period) =>
        formatDateByMode(period, mode)
    )
    const movingAverages = movingAverage(periodPlRatio, movingAvgWindow)

    return {
        labels: formattedLabels,
        datasets: [
            {
                type: 'line' as const,
                label: `Moyenne mobile (${movingAvgWindow})`,
                data: movingAverages,
                borderColor: '#6366f1',
                backgroundColor: '#6366f133',
                fill: false,
                tension: 0.2,
                pointRadius: 3,
                pointBackgroundColor: '#6366f1',
                yAxisID: 'y',
            },
            {
                type: 'bar' as const,
                label: 'P/L Ratio',
                data: periodPlRatio,
                backgroundColor: '#f59e0b',
                borderRadius: 4,
                barPercentage: 0.6,
            },
        ],
    }
}

// Génère les données pour le graphique Winrate
export const generateWinrateChartData = (
    trades: TradeType[],
    mode: 'day' | 'week' | 'month' | 'year',
    movingAvgWindow: number,
    useNet: boolean,
    settings: Partial<SettingsContentType> | null,
    preGroupedTrades?: Record<string, TradeType[]>
) => {
    if (!trades || trades.length === 0) {
        return {
            labels: [],
            datasets: [
                {
                    type: 'bar' as const,
                    label: 'Winrate',
                    data: [],
                    backgroundColor: '',
                    borderRadius: 4,
                    barPercentage: 0.6,
                },
            ],
        }
    }

    const groupedTrades =
        preGroupedTrades ?? groupTradesByPeriod(trades, mode, settings)
    const periods = Object.keys(groupedTrades).sort()

    const periodWinrate = periods.map((period) =>
        getWinrate(groupedTrades[period], 2, useNet)
    )
    const formattedLabels = periods.map((period) =>
        formatDateByMode(period, mode)
    )
    const winrateMovingAvg = movingAverage(periodWinrate, movingAvgWindow)

    return {
        labels: formattedLabels,
        datasets: [
            {
                type: 'line' as const,
                label: `Moyenne mobile (${movingAvgWindow})`,
                data: winrateMovingAvg,
                borderColor: '#6366f1',
                backgroundColor: '#6366f133',
                fill: false,
                tension: 0.2,
                pointRadius: 3,
                pointBackgroundColor: '#6366f1',
                yAxisID: 'y',
            },
            {
                type: 'bar' as const,
                label: 'Winrate',
                data: periodWinrate,
                backgroundColor: '#f472b6',
                borderRadius: 4,
                barPercentage: 0.6,
            },
        ],
    }
}

// --- Statistiques journalières ---

type DailyPnl = {
    date: string
    pnl: number
}

export const getDailyPnlArray = (
    trades: TradeExtendedType[],
    useNet: boolean,
    settings: Partial<SettingsContentType> | null
): DailyPnl[] => {
    const grouped = groupTradesByPeriod(trades, 'day', settings)
    const entries = Object.entries(grouped).map(([date, dayTrades]) => ({
        date,
        pnl: dayTrades.reduce(
            (sum, t) => sum + (useNet ? t.netProfit : t.profit),
            0
        ),
    }))
    return entries.sort((a, b) => a.date.localeCompare(b.date))
}

export const getTotalTradingDays = (dailyPnls: DailyPnl[]): number =>
    dailyPnls.length

// Groupe les trades par semaine et calcule le % de semaines gagnantes
export const getWinningWeeksPercent = (
    trades: TradeExtendedType[],
    useNet: boolean,
    settings: Partial<SettingsContentType> | null
): number => {
    const grouped = groupTradesByPeriod(trades, 'week', settings)
    const weeks = Object.values(grouped)
    if (weeks.length === 0) return 0
    const winning = weeks.filter(
        (weekTrades) =>
            weekTrades.reduce(
                (sum, t) => sum + (useNet ? t.netProfit : t.profit),
                0
            ) > 0
    )
    return (winning.length / weeks.length) * 100
}

// Groupe les trades par mois et calcule le % de mois gagnants
export const getWinningMonthsPercent = (
    trades: TradeExtendedType[],
    useNet: boolean,
    settings: Partial<SettingsContentType> | null
): number => {
    const grouped = groupTradesByPeriod(trades, 'month', settings)
    const months = Object.values(grouped)
    if (months.length === 0) return 0
    const winning = months.filter(
        (monthTrades) =>
            monthTrades.reduce(
                (sum, t) => sum + (useNet ? t.netProfit : t.profit),
                0
            ) > 0
    )
    return (winning.length / months.length) * 100
}

// Compte les jours ouvrés (lundi-vendredi) entre deux dates, inclus
export const countBusinessDays = (startDate: Date, endDate: Date): number => {
    if (startDate > endDate) return 0
    let count = 0
    const current = new Date(startDate)
    current.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)
    while (current <= end) {
        const day = current.getDay()
        if (day !== 0 && day !== 6) count++ // 0=dimanche, 6=samedi
        current.setDate(current.getDate() + 1)
    }
    return count
}

// Calcule les jours ouvrés de la période couverte par les trades
// (du premier au dernier trade, sans week-ends)
export const getBusinessDaysFromTrades = (
    trades: TradeExtendedType[]
): number => {
    if (trades.length === 0) return 0
    const dates = trades
        .map((t) => (t.closeDate ? new Date(t.closeDate) : null))
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime())
    if (dates.length === 0) return 0
    return countBusinessDays(dates[0], dates[dates.length - 1])
}

export const getWinningDaysCount = (dailyPnls: DailyPnl[]): number =>
    dailyPnls.filter((d) => d.pnl > 0).length

export const getLosingDaysCount = (dailyPnls: DailyPnl[]): number =>
    dailyPnls.filter((d) => d.pnl < 0).length

export const getBreakevenDaysCount = (dailyPnls: DailyPnl[]): number =>
    dailyPnls.filter((d) => d.pnl === 0).length

export const getMaxConsecutiveWinningDays = (dailyPnls: DailyPnl[]): number => {
    let max = 0
    let current = 0
    for (const day of dailyPnls) {
        if (day.pnl > 0) {
            current += 1
            max = Math.max(max, current)
        } else {
            current = 0
        }
    }
    return max
}

export const getMaxConsecutiveLosingDays = (dailyPnls: DailyPnl[]): number => {
    let max = 0
    let current = 0
    for (const day of dailyPnls) {
        if (day.pnl < 0) {
            current += 1
            max = Math.max(max, current)
        } else {
            current = 0
        }
    }
    return max
}

export const getAverageDailyPnl = (
    dailyPnls: DailyPnl[],
    round = -1
): number => {
    if (dailyPnls.length === 0) return 0
    const avg = dailyPnls.reduce((sum, d) => sum + d.pnl, 0) / dailyPnls.length
    return round < 0 ? avg : _round(avg, round)
}

export const getAverageWinningDayPnl = (
    dailyPnls: DailyPnl[],
    round = -1
): number => {
    const winners = dailyPnls.filter((d) => d.pnl > 0)
    if (winners.length === 0) return 0
    const avg = winners.reduce((sum, d) => sum + d.pnl, 0) / winners.length
    return round < 0 ? avg : _round(avg, round)
}

export const getAverageLosingDayPnl = (
    dailyPnls: DailyPnl[],
    round = -1
): number => {
    const losers = dailyPnls.filter((d) => d.pnl < 0)
    if (losers.length === 0) return 0
    const avg = losers.reduce((sum, d) => sum + d.pnl, 0) / losers.length
    return round < 0 ? avg : _round(avg, round)
}

export const getLargestProfitableDay = (
    dailyPnls: DailyPnl[]
): DailyPnl | null => {
    const winners = dailyPnls.filter((d) => d.pnl > 0)
    if (winners.length === 0) return null
    return winners.reduce((max, d) => (d.pnl > max.pnl ? d : max), winners[0])
}

export const getLargestLosingDay = (dailyPnls: DailyPnl[]): DailyPnl | null => {
    const losers = dailyPnls.filter((d) => d.pnl < 0)
    if (losers.length === 0) return null
    return losers.reduce((min, d) => (d.pnl < min.pnl ? d : min), losers[0])
}

export const getDailyMaxDrawdownWithPercent = (
    dailyPnls: DailyPnl[],
    round = -1
) => {
    let balance = 0
    let peak = 0
    let maxDrawdown = 0
    let maxDrawdownPercent = 0

    for (const day of dailyPnls) {
        balance += day.pnl
        if (balance > peak) {
            peak = balance
        } else {
            const drawdown = peak - balance
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown
                maxDrawdownPercent = peak === 0 ? 0 : (drawdown / peak) * 100
            }
        }
    }

    return {
        maxDrawdown: round < 0 ? maxDrawdown : _round(maxDrawdown, round),
        maxDrawdownPercent:
            round < 0 ? maxDrawdownPercent : _round(maxDrawdownPercent, round),
    }
}

export const getAverageDrawdown = (
    dailyPnls: DailyPnl[],
    round = -1
): number => {
    let balance = 0
    let peak = 0
    let totalDrawdown = 0
    let drawdownDays = 0

    for (const day of dailyPnls) {
        balance += day.pnl
        if (balance > peak) {
            peak = balance
        } else {
            const drawdown = peak - balance
            totalDrawdown += drawdown
            drawdownDays += 1
        }
    }

    if (drawdownDays === 0) return 0
    const avg = totalDrawdown / drawdownDays
    return round < 0 ? avg : _round(avg, round)
}

export const getAverageDrawdownPercent = (
    dailyPnls: DailyPnl[],
    round = -1
): number => {
    let balance = 0
    let peak = 0
    let totalPercent = 0
    let drawdownDays = 0

    for (const day of dailyPnls) {
        balance += day.pnl
        if (balance > peak) {
            peak = balance
        } else {
            const drawdown = peak - balance
            const percent = peak === 0 ? 0 : (drawdown / peak) * 100
            totalPercent += percent
            drawdownDays += 1
        }
    }

    if (drawdownDays === 0) return 0
    const avg = totalPercent / drawdownDays
    return round < 0 ? avg : _round(avg, round)
}

// --- Formatage ---

export const formatNumberValue = (
    value: number | null | undefined,
    decimals: number = 2
): string => {
    if (value === undefined || value === null || !isFinite(value)) return '---'
    return value.toFixed(decimals)
}

export const formatDimensionLabel = (
    dimension: BreakdownDimension,
    key: string,
    translate: (key: string) => string
): string => {
    if (dimension === 'dayOfWeekOpen' || dimension === 'dayOfWeekClose') {
        const dayKeys = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
        ]
        const index = parseInt(key, 10)
        if (index >= 0 && index <= 6)
            return translate(`common.weekdays.long.${dayKeys[index]}`)
        return key
    }
    if (dimension === 'monthOpen' || dimension === 'monthClose') {
        const index = parseInt(key, 10)
        if (index >= 0 && index <= 11)
            return translate(`common.months.long.${index}`)
        return key
    }
    if (dimension === 'monthYearOpen' || dimension === 'monthYearClose') {
        const [year, monthNumber] = key.split('-')
        const index = parseInt(monthNumber, 10) - 1
        if (index >= 0 && index <= 11)
            return `${translate(`common.months.long.${index}`)} ${year}`
    }
    return key
}

// --- Couleurs ---

export const hexToRgba = (hex: string, alpha: number = 1): string => {
    hex = hex.replace('#', '')

    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((char) => char + char)
            .join('')
    }

    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const rgbaToHex = (rgba: string): string => {
    const match = rgba.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/)

    if (!match) {
        return '#000000'
    }

    const r = parseInt(match[1])
    const g = parseInt(match[2])
    const b = parseInt(match[3])

    const toHex = (n: number) => {
        const hex = n.toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export const colorToRgba = (color: string, alpha: number = 1): string => {
    if (color.startsWith('rgba(')) {
        return color.replace(/[\d.]+\)$/, `${alpha})`)
    }

    if (color.startsWith('rgb(')) {
        return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
    }

    if (color.startsWith('#')) {
        return hexToRgba(color, alpha)
    }

    return `rgba(0, 0, 0, ${alpha})`
}

export const getBodyTextColor = (): string => {
    if (typeof document === 'undefined') return '#111827'
    return getComputedStyle(document.body).color
}

export const normalizeColorToHex = (color: string): string => {
    if (color.startsWith('#')) {
        return color.toUpperCase()
    }

    if (color.startsWith('rgba(') || color.startsWith('rgb(')) {
        return rgbaToHex(color)
    }

    return '#000000'
}

// --- ECharts builders ---

export type EChartsGridOption = {
    left?: number
    right?: number
    top?: number
    bottom?: number
}

export type EChartsItemStyle = {
    color?: string
    borderRadius?: number | number[]
    borderColor?: string
    borderWidth?: number
}

export type EChartsLineStyle = {
    width?: number
    color?: string
    type?: 'solid' | 'dashed' | 'dotted'
}

export type EChartsAreaStyle = {
    color?: string
    opacity?: number
    origin?: number | 'start' | 'end' | 'auto'
}

export type EChartsSeriesEmphasis = {
    disabled?: boolean
    itemStyle?: EChartsItemStyle
}

export type EChartsFormatterParams<V = number> = {
    seriesName?: string
    name?: string
    value: V
    dataIndex: number
    seriesIndex: number
    data: unknown
}

export interface BarDataItem {
    value: number
    itemStyle?: {
        color?: string
        borderRadius?: number | number[]
    }
}

export interface BarSeriesConfig {
    data: BarDataItem[]
    barMaxWidth?: number
    barMinHeight?: number
    barGap?: string
    barCategoryGap?: string
    emphasis?: {
        disabled?: boolean
        itemStyle?: {
            borderColor?: string
            borderWidth?: number
        }
    }
}

export interface LineSeriesConfig {
    name: string
    data: (number | null)[]
    color: string
    smooth?: number
    symbol?: string
    symbolSize?: number
    showSymbol?: boolean
    areaStyle?: EChartsAreaStyle
    lineStyle?: EChartsLineStyle
    connectNulls?: boolean
}

export type ScatterDataPoint = {
    value: number[]
    itemStyle?: {
        color?: string
        borderColor?: string
        borderWidth?: number
        borderType?: string
    }
}

export interface ScatterSeriesConfig {
    data: ScatterDataPoint[]
    symbolSize?: number | ((data: unknown[]) => number)

    emphasis?: {
        scale?: number
        itemStyle?: {
            borderColor?: string
            borderWidth?: number
        }
    }
}

export interface HeatmapSeriesConfig {
    data: [number | string, number | string, number][]
    name?: string
}

export interface VisualMapConfig {
    min: number
    max: number
    inRange?: { color?: string[] }
    outOfRange?: { color?: string }
}

export const buildBarColors = (
    values: number[],
    positiveColor: string,
    negativeColor: string,
    neutralColor: string
): string[] => {
    return values.map((v) =>
        v > 0 ? positiveColor : v < 0 ? negativeColor : neutralColor
    )
}

export const buildBarData = (
    values: (number | null)[],
    colors: string[],
    borderRadiusFn?: (v: number) => number[]
): BarDataItem[] => {
    return values.map((v, i) => ({
        value: v,
        itemStyle: {
            color: colors[i],
            borderRadius:
                borderRadiusFn && v != null ? borderRadiusFn(v) : [3, 3, 0, 0],
        },
    }))
}

export const buildBarSeries = (
    config: BarSeriesConfig
): EChartsOption['series'] => {
    return [
        {
            type: 'bar' as const,
            data: config.data,
            barMaxWidth: config.barMaxWidth ?? 32,
            barMinHeight: config.barMinHeight ?? 1,
            barGap: config.barGap,
            barCategoryGap: config.barCategoryGap,
            emphasis: config.emphasis ?? { disabled: true },
        },
    ]
}

export const buildLineSeries = (config: LineSeriesConfig): LineSeriesOption => {
    return {
        type: 'line' as const,
        name: config.name,
        data: config.data,
        smooth: config.smooth ?? 0.2,
        symbol: config.symbol ?? 'circle',
        symbolSize: config.symbolSize ?? 4,
        showSymbol:
            config.showSymbol ?? (config.symbolSize === 0 ? false : undefined),
        lineStyle: (config.lineStyle ?? {
            width: 2,
            color: config.color,
        }) as LineSeriesOption['lineStyle'],
        itemStyle: { color: config.color },
        areaStyle: config.areaStyle as LineSeriesOption['areaStyle'],
        connectNulls: config.connectNulls ?? false,
        emphasis: { disabled: true },
    }
}

export const buildScatterSeries = (
    config: ScatterSeriesConfig,
    isDark?: boolean
): ScatterSeriesOption => {
    return {
        type: 'scatter' as const,
        data: config.data as ScatterSeriesOption['data'],
        symbolSize: config.symbolSize ?? 10,
        emphasis: config.emphasis ?? {
            scale: 1.3,
            itemStyle: {
                borderColor: isDark ? '#ffffff' : '#1f2937',
                borderWidth: 2,
            },
        },
    }
}

export const buildHeatmapSeries = (
    config: HeatmapSeriesConfig,
    isDark?: boolean
): HeatmapSeriesOption => {
    return {
        name: config.name ?? 'Heatmap',
        type: 'heatmap' as const,
        data: config.data,
        label: { show: false },
        emphasis: {
            itemStyle: {
                borderColor: isDark ? '#ffffff' : '#1f2937',
                borderWidth: 2,
            },
        },
    }
}

export const buildVisualMap = (
    config: VisualMapConfig,
    isDark?: boolean
): VisualMapComponentOption => {
    return {
        min: config.min,
        max: config.max,
        calculable: true,
        orient: 'horizontal' as const,
        left: 'center',
        bottom: 0,
        show: false,
        inRange: config.inRange ?? {
            color: [
                '#000000',
                '#2a1500',
                '#552a00',
                '#803f00',
                '#ab5500',
                '#d66a00',
                '#ff8000',
                '#ffaa33',
                '#ffd480',
                '#fff5cc',
            ],
        },
        outOfRange: config.outOfRange ?? {
            color: isDark ? '#111827' : '#f3f4f6',
        },
    }
}

export const echartsFontFamily =
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'

export const getEchartsBaseOption = (
    fontFamily?: string
): Partial<EChartsOption> => ({
    animation: true,
    animationDuration: 300,
    animationEasing: 'cubicOut' as const,
    textStyle: { fontFamily: fontFamily || echartsFontFamily },
    grid: { left: 70, right: 16, top: 12, bottom: 28 },
})

export const getEchartsAxisColors = (isDark: boolean) => ({
    axisColor: isDark ? '#4b5563' : '#ccc',
    textColor: isDark ? '#eeeeee' : '#444',
})

export const getEchartsTooltipColors = () => ({
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: 'transparent',
    textColor: '#e5e7eb',
})

export const getEchartsCenterTextGraphic = (
    text: string,
    textColor: string,
    fontFamily: string
) => ({
    type: 'text' as const,
    left: 'center' as const,
    top: 'center' as const,
    style: {
        text,
        textAlign: 'center' as const,
        textVerticalAlign: 'middle' as const,
        fontSize: 18,
        fontWeight: 'bold' as const,
        fill: textColor,
        fontFamily,
    },
})

export const echartsSeriesBase = {
    emphasis: { disabled: true },
}

interface LabelContext {
    dataset: { data: number[] }
    dataIndex: number
    chart: { scales: { y: { min: number; max: number } } }
}

export const getSmartLabelAlign = (context: LabelContext) => {
    const value = context.dataset.data[context.dataIndex] as number
    const chart = context.chart
    const yScale = chart.scales.y

    const yMin = yScale.min
    const yMax = yScale.max
    const range = yMax - yMin

    const relativePosition = (value - yMin) / range

    if (relativePosition > 0.9 || relativePosition < 0.1) {
        return 'center'
    }

    return value >= 0 ? 'top' : 'bottom'
}

export const getSmartLabelAnchor = (context: LabelContext) => {
    const value = context.dataset.data[context.dataIndex] as number
    const chart = context.chart
    const yScale = chart.scales.y

    const yMin = yScale.min
    const yMax = yScale.max
    const range = yMax - yMin

    const relativePosition = (value - yMin) / range

    if (relativePosition > 0.9 || relativePosition < 0.1) {
        return 'center'
    }

    return value >= 0 ? 'end' : 'start'
}

// --- Chart colors ---

export type MetricCategory = 'monetary' | 'percent' | 'raw'

const monetaryMetrics: BreakdownMetric[] = [
    'pnl',
    'appt',
    'avgWin',
    'avgLoss',
    'expectancy',
    'drawdown',
    'currentDrawdown',
]

const percentMetrics: BreakdownMetric[] = ['winrate']

export const getMetricCategory = (metric: BreakdownMetric): MetricCategory => {
    if (monetaryMetrics.includes(metric)) return 'monetary'
    if (percentMetrics.includes(metric)) return 'percent'
    return 'raw'
}

export const isMonetaryMetric = (metric: BreakdownMetric): boolean =>
    getMetricCategory(metric) === 'monetary'

export const chartColors = {
    profit: '#16a34a',
    loss: '#dc2626',
    neutral: '#9ca3af',
} as const

export const hslColorForValue = (
    val: number,
    min: number,
    max: number,
    saturation = 45,
    lightness = 55
): string => {
    const range = max - min
    if (range <= 0) return `hsl(60, ${saturation}%, ${lightness}%)`
    const normalized = Math.max(0, Math.min(1, (val - min) / range))
    const hue = normalized * 120
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

export const monetaryColorForValue = (
    val: number,
    saturation = 45,
    lightness = 55
): string => {
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

export const winrateColor = (
    wr: number,
    saturation = 45,
    lightness = 55
): string => {
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

export const profitFactorColor = (
    pf: number,
    saturation = 45,
    lightness = 55
): string => {
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

// --- Axis scale ---

export type AxisBounds = {
    axisMin: number
    axisMax: number
    minVal: number
    maxVal: number
    step: number
    logMin: number
    logMinNeg: number
}

export const computeAxisBounds = (finiteVals: number[]): AxisBounds => {
    if (finiteVals.length === 0)
        return {
            axisMin: 0,
            axisMax: 1,
            minVal: 0,
            maxVal: 1,
            step: 1,
            logMin: 0,
            logMinNeg: 0,
        }
    const minVal = Math.min(...finiteVals)
    const maxVal = Math.max(...finiteVals)
    const step = (maxVal - minVal) / 8 || Math.abs(maxVal) || 1
    const allPositive = finiteVals.every((v) => v >= 0)
    const allNegative = finiteVals.every((v) => v <= 0)
    const axisMin = allPositive ? 0 : minVal - step
    const axisMax = allNegative ? 0 : maxVal + step
    const positiveVals = finiteVals.filter((v) => v > 0)
    const negativeVals = finiteVals.filter((v) => v < 0)
    const logMin =
        positiveVals.length > 0 ? Math.log(Math.min(...positiveVals)) : 0
    const logMinNeg =
        negativeVals.length > 0
            ? Math.log(Math.abs(Math.max(...negativeVals)))
            : 0
    return { axisMin, axisMax, minVal, maxVal, step, logMin, logMinNeg }
}

export const scaleValue = (
    val: number,
    bounds: AxisBounds,
    _useLog: boolean
): number => {
    const { axisMin, axisMax } = bounds
    if (val === Infinity || val === -Infinity) return axisMax
    if (isNaN(val)) return axisMin
    if (val > axisMax) return axisMax
    if (val < axisMin) return axisMin
    return val
}

export const inverseScaleValue = (
    pos: number,
    _bounds: AxisBounds,
    _useLog: boolean
): number => {
    return pos
}

export const makeAxisLabel =
    (bounds: AxisBounds, _useLog: boolean, formatFn: (v: number) => string) =>
    (v: number) =>
        formatFn(v)

// --- Tooltip formatting ---

export const formatTradeTooltipField = (
    tr: TradeExtendedType,
    field: TradeTooltipField,
    t: (key: string) => string,
    durationMin?: number
): string => {
    const tradeFields: TradeTooltipField[] = [
        'lot',
        'openPrice',
        'closePrice',
        'commission',
        'mfe',
        'mae',
        'side',
        'duration',
        'pnl',
    ]
    if (!tradeFields.includes(field)) return ''
    const label = t(`components.dashboard.breakdown.trade_property.${field}`)
    switch (field) {
        case 'lot':
            return `${label}: ${tr.lot}`
        case 'openPrice':
            return `${label}: ${tr.openPrice}`
        case 'closePrice':
            return `${label}: ${tr.closePrice}`
        case 'commission':
            return tr.commission
                ? `${label}: ${formatCurrency(tr.commission)}`
                : ''
        case 'mfe':
            return `${label}: ${tr.mfe != null ? tr.mfe : '-'}`
        case 'mae':
            return `${label}: ${tr.mae != null ? tr.mae : '-'}`
        case 'side':
            return `${label}: ${tr.type}`
        case 'duration': {
            const min = durationMin ?? 0
            if (min < 60) return `${label}: ${min.toFixed(0)}m`
            if (min < 1440) return `${label}: ${(min / 60).toFixed(1)}h`
            return `${label}: ${(min / 1440).toFixed(1)}d`
        }
        case 'pnl':
            return `${label}: ${formatCurrency(tr.profit)}`
        default:
            return ''
    }
}
