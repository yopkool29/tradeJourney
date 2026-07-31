import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { TradeType } from '~/schema/trade'
import type { SettingsContentType } from '~/schema/user'
import { getTimeZoneFromSettings, formatDateKeyForGrouping } from '~/utils/date-utils'
import { isBreakdownKey } from '~/type'

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
	return items.map(item => {
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

export const resizableGridItems = ['allTrades', 'profitTrades', 'losingTrades', 'winLossComparison', 'riskRatios', 'dayStatistics']

export const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

export const formatDateByMode = (period: string, mode: string, longDate = false): string => {
    const date = new Date(period);
    switch (mode) {
        case 'day': {
            const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' };
            if (longDate) {
                options.year = 'numeric';
            }
            return date.toLocaleDateString('fr-FR', options);
        }
        case 'week': {
            const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' };
            if (longDate) {
                options.year = 'numeric';
            }
            return `S${getWeekNumber(date)} ${date.toLocaleDateString('fr-FR', options)}`;
        }
        case 'month': {
            return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        }
        case 'year': {
            return date.getFullYear().toString();
        }
        default: {
            return period;
        }
    }
}

export const periodTranslations = {
    'custom': { en: 'Custom', fr: 'Personnaliser', includeEndDay: true },
    'this_week': { en: 'This Week', fr: 'Cette Semaine', includeEndDay: true },
    'last_week': { en: 'Last Week', fr: 'La Semaine Dernière', includeEndDay: false },
    'last_week_until_now': { en: 'Last Week Until Now', fr: 'La Semaine Dernière Jusqu\'à  Maintenant', includeEndDay: true },
    'last_two_weeks': { en: 'Last Two Weeks', fr: 'Les Deux Dernières Semaines', includeEndDay: false },
    'last_two_weeks_until_now': { en: 'Last Two Weeks Until Now', fr: 'Les Deux Dernières Semaines Jusqu\'à Maintenant', includeEndDay: true },
    'this_month': { en: 'This Month', fr: 'Ce Mois', includeEndDay: true },
    'last_month': { en: 'Last Month', fr: 'Le Mois Dernier', includeEndDay: false },
    'last_month_until_now': { en: 'Last Month Until Now', fr: 'Le Mois Dernier Jusqu\'à Maintenant', includeEndDay: true },
    'last_two_months': { en: 'Last Two Months', fr: 'Les Deux Derniers Mois', includeEndDay: false },
    'last_two_months_until_now': { en: 'Last Two Months Until Now', fr: 'Les Deux Derniers Mois Jusqu\'à Maintenant', includeEndDay: true },
    'last_three_months': { en: 'Last Three Months', fr: 'Les Trois Derniers Mois', includeEndDay: false },
    'last_three_months_until_now': { en: 'Last Three Months Until Now', fr: 'Les Trois Derniers Mois Jusqu\'à Maintenant', includeEndDay: true },
    'this_year': { en: 'This Year', fr: 'Cette Année', includeEndDay: true },
    'last_year': { en: 'Last Year', fr: 'L\'Année Dernière', includeEndDay: false }
}

export const periodOptions = (local = "fr") => {
    return Object.entries(periodTranslations).map(([value, { fr, en }]) => ({
        label: local == "fr" ? fr : en,
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
                includeEndDay: periodTranslations[period].includeEndDay
            }
        case 'last_week': {
            const ref = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return {
                start: startOfWeek(ref, { weekStartsOn: 1 }),
                end: endOfWeek(ref, { weekStartsOn: 1 }),
                includeEndDay: periodTranslations[period].includeEndDay
            }
        }
        case 'last_week_until_now': {
            const ref = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return {
                start: startOfWeek(ref, { weekStartsOn: 1 }),
                end: today,
                includeEndDay: periodTranslations[period].includeEndDay
            }
        }
        case 'last_two_weeks': {
            const refStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
            const refEnd = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return {
                start: startOfWeek(refStart, { weekStartsOn: 1 }),
                end: endOfWeek(refEnd, { weekStartsOn: 1 }),
                includeEndDay: periodTranslations[period].includeEndDay
            }
        }
        case 'last_two_weeks_until_now': {
            const ref = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
            return {
                start: startOfWeek(ref, { weekStartsOn: 1 }),
                end: today,
                includeEndDay: periodTranslations[period].includeEndDay
            }
        }
        case 'this_month':
            return {
                start: startOfMonth(today),
                end: endOfMonth(today),
                includeEndDay: periodTranslations[period].includeEndDay
            }
        case 'last_month': {
            const ref = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            return {
                start: startOfMonth(ref),
                end: endOfMonth(ref),
                includeEndDay: periodTranslations[period].includeEndDay
            }
        }
        case 'last_month_until_now': {
            const ref = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            return {
                start: startOfMonth(ref),
                end: today,
                includeEndDay: periodTranslations[period].includeEndDay
            }
        }
        case 'last_two_months': {
            const refStart = new Date(today.getFullYear(), today.getMonth() - 2, 1)
            const refEnd = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            return {
                start: startOfMonth(refStart),
                end: endOfMonth(refEnd),
                includeEndDay: periodTranslations[period].includeEndDay
            }
        }
        case 'last_two_months_until_now': {
            const ref = new Date(today.getFullYear(), today.getMonth() - 2, 1)
            return {
                start: startOfMonth(ref),
                end: today,
                includeEndDay: periodTranslations[period].includeEndDay
            }
        }
        case 'last_three_months': {
            const refStart = new Date(today.getFullYear(), today.getMonth() - 3, 1)
            const refEnd = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            return {
                start: startOfMonth(refStart),
                end: endOfMonth(refEnd),
                includeEndDay: periodTranslations[period].includeEndDay
            }
        }
        case 'last_three_months_until_now': {
            const ref = new Date(today.getFullYear(), today.getMonth() - 3, 1)
            return {
                start: startOfMonth(ref),
                end: today,
                includeEndDay: periodTranslations[period].includeEndDay
            }
        }
        case 'this_year': {
            return {
                start: startOfYear(today),
                end: endOfYear(today),
                includeEndDay: periodTranslations[period].includeEndDay
            }
        }
        case 'last_year': {
            const ref = new Date(today.getFullYear() - 1, 0, 1)
            return {
                start: startOfYear(ref),
                end: endOfYear(ref),
                includeEndDay: periodTranslations[period].includeEndDay
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

    sortedTrades.forEach(trade => {
        const closeDate = new Date(trade.closeDate)
        let key: string

        switch (mode) {
            case 'day':
                key = formatDateKeyForGrouping(closeDate, 'day', timezoneMode, timezoneLocal, timezoneUtcOffset)
                break
            case 'week': {
                const timeZone = getTimeZoneFromSettings(timezoneMode, timezoneLocal, timezoneUtcOffset)
                const zonedDate = toZonedTime(closeDate, timeZone)
                const monday = startOfWeek(zonedDate, { weekStartsOn: 1 })
                key = formatDateKeyForGrouping(fromZonedTime(monday, timeZone), 'day', timezoneMode, timezoneLocal, timezoneUtcOffset)
                break
            }
            case 'month':
                key = formatDateKeyForGrouping(closeDate, 'month', timezoneMode, timezoneLocal, timezoneUtcOffset)
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSmartLabelAlign = (context: any) => {
    const value = context.dataset.data[context.dataIndex] as number;
    const chart = context.chart;
    const yScale = chart.scales.y;

    // Obtenir les valeurs min et max de l'axe Y
    const yMin = yScale.min;
    const yMax = yScale.max;
    const range = yMax - yMin;

    // Calculer la position relative de la valeur dans l'échelle
    const relativePosition = (value - yMin) / range;

    // Si la valeur est trop proche des extrémités (10% du haut ou du bas), positionner au centre
    if (relativePosition > 0.9 || relativePosition < 0.1) {
        return 'center';
    }

    // Sinon positionner en haut pour les valeurs positives, en bas pour les négatives
    return value >= 0 ? 'top' : 'bottom';
};

/**
 * Détermine l'ancrage optimal d'un label par rapport à sa valeur dans un graphique
 * @param context Le contexte du label fourni par chartjs-plugin-datalabels
 * @returns Le point d'ancrage ('start', 'end', 'center')
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSmartLabelAnchor = (context: any) => {
    const value = context.dataset.data[context.dataIndex] as number;
    const chart = context.chart;
    const yScale = chart.scales.y;

    // Obtenir les valeurs min et max de l'axe Y
    const yMin = yScale.min;
    const yMax = yScale.max;
    const range = yMax - yMin;

    // Calculer la position relative de la valeur dans l'échelle
    const relativePosition = (value - yMin) / range;

    // Si la valeur est trop proche des extrémités, positionner au centre
    if (relativePosition > 0.9 || relativePosition < 0.1) {
        return 'center';
    }

    return value >= 0 ? 'end' : 'start';
};
