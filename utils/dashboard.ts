import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { getPNL, getAPPT, getWinrate, movingAverage, getPLRatio as calculatePLRatio } from './tradeStats'
import type { TradeType } from '~/schema/trade'
import { formatDate } from '~/utils/index'

export const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

export const formatDateByMode = (period: string, mode: string): string => {
    const date = new Date(period);
    switch (mode) {
        case 'day':
            return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
        case 'week':
            return `S${getWeekNumber(date)} ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })}`;
        case 'month':
            return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        case 'year':
            return date.getFullYear().toString();
        default:
            return period;
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

/**
 * Génère les données pour un graphique d'évolution du PnL intraday
 * @param trades Liste des trades de la journée
 * @param interval Intervalle de temps en minutes (défaut: 15 minutes)
 * @returns Données formatées pour un graphique Chart.js
 */
export const generateIntradayPnlChartData = (trades: TradeType[]) => {
    if (!trades || trades.length === 0) {
        return {
            labels: [],
            datasets: [
                {
                    label: 'PnL Cumulé',
                    data: [],
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.2)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    borderWidth: 2
                }
            ]
        };
    }

    // Calculer le PnL cumulé
    let cumulativePnl = 0;
    let count = 0
    const dataPoints: Array<{ count: number; pnl: number; date?: Date }> = trades.map(trade => {
        cumulativePnl += trade.profit || 0;
        count++
        return {
            count: count,
            date: trade.openDate,
            pnl: parseFloat(cumulativePnl.toFixed(2))
        };
    });

    // Ajouter un point à 0 au début de la journée si nécessaire
    if (dataPoints.length > 0) {
        dataPoints.unshift({
            count: 0,
            date: undefined,
            pnl: 0
        });
    }

    return dataPoints;
}

/**
 * Groupe les trades par période (jour, semaine, mois, année)
 * @param trades Liste des trades
 * @param mode Mode de regroupement ('day', 'week', 'month', 'year')
 * @returns Trades groupés par période
 */
export const groupTradesByPeriod = (trades: TradeType[], mode: 'day' | 'week' | 'month' | 'year' = 'day') => {
    // Trier les trades par date de clôture
    const sortedTrades = [...trades].sort((a, b) => {
        const dateA = new Date(a.closeDate)
        const dateB = new Date(b.closeDate)
        return dateA.getTime() - dateB.getTime()
    })

    const groupedTrades: Record<string, TradeType[]> = {}

    sortedTrades.forEach(trade => {
        const closeDate = new Date(trade.closeDate)
        let key: string

        let day: number;
        let diff: number;
        let monday: Date;

        switch (mode) {
            case 'day':
                key = formatDate(closeDate, false, 'en') // ex: DD/MM/YYY
                key = key.split('/').reverse().join('-') // YYYY-MM-DD
                break
            case 'week':
                // Obtenir le premier jour de la semaine (lundi)
                day = closeDate.getDay() || 7 // Transformer 0 (dimanche) en 7
                diff = closeDate.getDate() - day + 1 // Ajuster au lundi
                monday = new Date(closeDate)
                monday.setDate(diff)

                key = formatDate(monday, false, 'en') // ex: DD/MM/YYY
                key = key.split('/').reverse().join('-') // YYYY-MM-DD
                
                // key = monday.toISOString().split('T')[0] // YYYY-MM-DD du lundi
                break
            case 'month':
                key = `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, '0')}`
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

/**
 * Génère les données pour le graphique de PnL cumulé
 * @param trades Liste des trades
 * @param mode Mode de regroupement ('day', 'week', 'month', 'year')
 * @returns Données formatées pour le graphique
 */
export const generateCumulatedPnlChartData = (trades: TradeType[], mode: 'day' | 'week' | 'month' | 'year' = 'week') => {
    if (!trades || trades.length === 0) {
        return {
            labels: [],
            datasets: [
                {
                    type: 'line',
                    label: 'Cumulé',
                    data: [],
                    borderColor: '', // Sera défini dans le composant
                    backgroundColor: '', // Sera défini dans le composant
                    fill: false,
                    tension: 0.2,
                    pointRadius: 4,
                    pointBackgroundColor: '', // Sera défini dans le composant
                    yAxisID: 'y',
                },
                {
                    type: 'bar',
                    label: 'PnL',
                    data: [],
                    backgroundColor: '', // Sera défini dans le composant
                    borderRadius: 4,
                    barPercentage: 0.6,
                }
            ]
        }
    }

    const groupedTrades = groupTradesByPeriod(trades, mode)
    const periods = Object.keys(groupedTrades).sort()

    // Calculer le PnL pour chaque période
    const periodPnl = periods.map(period => {
        const periodTrades = groupedTrades[period]
        return getPNL(periodTrades, 2)
    })

    // Calculer le PnL cumulé
    const cumulatedPnl: number[] = []
    let cumulated = 0
    periodPnl.forEach(pnl => {
        cumulated += pnl
        cumulatedPnl.push(cumulated)
    })

    // Formater les labels selon le mode
    const formattedLabels = periods.map(period => formatDateByMode(period, mode))

    return {
        labels: formattedLabels,
        datasets: [
            {
                type: 'line',
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
                type: 'bar',
                label: 'PnL',
                data: periodPnl,
                backgroundColor: '#38bdf8',
                borderRadius: 4,
                barPercentage: 0.6,
            }
        ]
    }
}

/**
 * Génère les données pour le graphique APPT
 * @param trades Liste des trades
 * @param mode Mode de regroupement ('day', 'week', 'month', 'year')
 * @param movingAvgWindow Taille de la fenêtre pour la moyenne mobile (par défaut: 5)
 * @returns Données formatées pour le graphique
 */
export const generateApptChartData = (trades: TradeType[], mode: 'day' | 'week' | 'month' | 'year' = 'week', movingAvgWindow: number = 5) => {
    if (!trades || trades.length === 0) {
        return {
            labels: [],
            datasets: [
                {
                    type: 'line',
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
                    type: 'bar',
                    label: 'APPT',
                    data: [],
                    backgroundColor: '', // Sera défini dans le composant
                    borderRadius: 4,
                    barPercentage: 0.6,
                }
            ]
        }
    }

    const groupedTrades = groupTradesByPeriod(trades, mode)
    const periods = Object.keys(groupedTrades).sort()

    // Calculer l'APPT pour chaque période
    const periodAppt = periods.map(period => {
        const periodTrades = groupedTrades[period]
        return getAPPT(periodTrades, true, 2)
    })

    // Formater les labels selon le mode
    const formattedLabels = periods.map(period => formatDateByMode(period, mode))

    // Calcul de la moyenne mobile de l'APPT
    const movingAverages = movingAverage(periodAppt, movingAvgWindow)

    return {
        labels: formattedLabels,
        datasets: [
            {
                type: 'line',
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
                type: 'bar',
                label: 'APPT',
                data: periodAppt,
                backgroundColor: '#4ade80',
                borderRadius: 4,
                barPercentage: 0.6,
            }
        ]
    }
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

/**
 * Génère les données pour le graphique de P/L Ratio
 * @param trades Liste des trades
 * @param mode Mode de regroupement ('day', 'week', 'month', 'year')
 * @param movingAvgWindow Taille de la fenêtre pour la moyenne mobile (par défaut: 5)
 * @returns Données formatées pour le graphique
 */
export const generatePlRatioChartData = (trades: TradeType[], mode: 'day' | 'week' | 'month' | 'year' = 'week', movingAvgWindow: number = 5) => {
    if (!trades || trades.length === 0) {
        return {
            labels: [],
            datasets: [
                {
                    type: 'line',
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
                    type: 'bar',
                    label: 'P/L Ratio',
                    data: [],
                    backgroundColor: '#f59e0b',
                    borderRadius: 4,
                    barPercentage: 0.6,
                }
            ]
        }
    }

    const groupedTrades = groupTradesByPeriod(trades, mode)
    const periods = Object.keys(groupedTrades).sort()

    // Calculer le P/L Ratio pour chaque période
    const periodPlRatio = periods.map(period => {
        const periodTrades = groupedTrades[period]
        return calculatePLRatio(periodTrades, 2)
    })

    const formattedLabels = periods.map(period => formatDateByMode(period, mode))
    const movingAverages = movingAverage(periodPlRatio, movingAvgWindow)

    return {
        labels: formattedLabels,
        datasets: [
            {
                type: 'line',
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
                type: 'bar',
                label: 'P/L Ratio',
                data: periodPlRatio,
                backgroundColor: '#f59e0b',
                borderRadius: 4,
                barPercentage: 0.6,
            }
        ]
    }
}

export const generateWinrateChartData = (trades: TradeType[], mode: 'day' | 'week' | 'month' | 'year' = 'week', movingAvgWindow: number = 5) => {
    if (!trades || trades.length === 0) {
        return {
            labels: [],
            datasets: [
                {
                    type: 'bar',
                    label: 'Winrate',
                    data: [],
                    backgroundColor: '', // Sera défini dans le composant
                    borderRadius: 4,
                    barPercentage: 0.6,
                }
            ]
        }
    }

    const groupedTrades = groupTradesByPeriod(trades, mode)
    const periods = Object.keys(groupedTrades).sort()

    // Calculer le Winrate pour chaque période
    const periodWinrate = periods.map(period => {
        const periodTrades = groupedTrades[period]
        return getWinrate(periodTrades, 2)
    })

    // Formater les labels selon le mode
    const formattedLabels = periods.map(period => formatDateByMode(period, mode))

    // Calcul de la moyenne mobile du winrate
    const winrateMovingAvg = movingAverage(periodWinrate, movingAvgWindow)

    return {
        labels: formattedLabels,
        datasets: [
            {
                type: 'line',
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
                type: 'bar',
                label: 'Winrate',
                data: periodWinrate,
                backgroundColor: '#f472b6',
                borderRadius: 4,
                barPercentage: 0.6,
            }
        ]
    }
}
