import type { AccountType } from '~/schema/account'
import type { TradeFilter } from '~/type'
import { transformAdvancedFilters } from '~/utils/filter-utils'
import {
    getPNL,
    getAPPT,
    getWinrate,
    getProfitFactor,
    getRecoveryFactor,
    getSharpeRatio,
    getAvgTradeDuration,
    getWinningTradesMetrics,
    getLosingTradesMetrics,
    getBreakevenTradesMetrics,
    getMaxRunUpWithDates,
    getMaxDrawdownWithDates,
    getPLRatio,
    getMaxWinningStreak,
    getMaxLosingStreak,
    getTotalContracts,
    getMaxTradeDuration,
    getExpectancy,
    getSortinoRatio,
    getCalmarRatio,
    getSQN,
    getUlcerIndex,
    sortTradesByCloseDate
} from '~/utils/tradeStats'
import {
    getTotalRMultiple,
    getAPPTInR,
    getProfitFactorInR,
    getPLRatioInR,
    getAvgWinLossInR,
    getLargestWinLossInR,
    getTotalProfitLossInR,
    getRMultiples,
    getRMultipleCoverage,
    getRMultipleReliability,
    countTradesWithStopLoss
} from '~/utils/rMultiple'
import type { RMultipleTrade } from '~/utils/rMultiple'
import {
    getDailyPnlArray,
    getTotalTradingDays,
    getBusinessDaysFromTrades,
    getWinningWeeksPercent,
    getWinningMonthsPercent,
    getWinningDaysCount,
    getLosingDaysCount,
    getBreakevenDaysCount,
    getMaxConsecutiveWinningDays,
    getMaxConsecutiveLosingDays,
    getAverageDailyPnl,
    getAverageWinningDayPnl,
    getAverageLosingDayPnl,
    getLargestProfitableDay,
    getLargestLosingDay,
    getDailyMaxDrawdownWithPercent,
    getAverageDrawdown,
    getAverageDrawdownPercent
} from '~/utils/dashboard'

export const buildFiltersForApi = (
    startDate: Date | null,
    endDate: Date | null,
    includeEndDay: boolean,
    accountIds: number[] = [],
    advancedFilters: TradeFilter[] = []
): TradeFilter[] => {
    const _startDate = startDate ? startDate.getTime() : null
    const _endDate = endDate ? endDate.getTime() : null

    const filtersForApi: TradeFilter[] = []
    if (_startDate) {
        filtersForApi.push({ column: 'closeDate', operator: '>=', value: _startDate })
    }
    if (_endDate) {
        const operator = includeEndDay ? '<=' : '<'
        filtersForApi.push({ column: 'closeDate', operator, value: _endDate })
    }

    // Gestion des comptes sélectionnés
    if (accountIds && accountIds.length > 0) {
        if (accountIds.length === 1) {
            filtersForApi.push({ column: 'accountId', operator: '=', value: accountIds[0] })
        } else {
            filtersForApi.push({
                column: 'accountId',
                operator: 'in',
                value: accountIds
            })
        }
    }

    // Ajouter les filtres avancés (exclure ceux avec valeur vide)
    if (advancedFilters && advancedFilters.length > 0) {
        filtersForApi.push(...transformAdvancedFilters(advancedFilters))
    }

    return filtersForApi
}

export const useDashboard = () => {

    const accounts = ref<AccountType[]>([])
    const { fetchTrades } = useTrades()
    const userStore = useUserStore()
    const dataStore = useDataStore()

    const fetchAccounts = async () => {
        if (!userStore.user) return
        accounts.value = await $fetch('/api/account') as AccountType[]
    }

    const fetchData = async (startDate: Date | null, endDate: Date | null, includeEndDay: boolean, accountIds: number[] = [], useNet: boolean = true, advancedFilters: TradeFilter[] = []) => {
        const filtersForApi = buildFiltersForApi(startDate, endDate, includeEndDay, accountIds, advancedFilters)

        let trades = await fetchTrades(filtersForApi, -1)

        // Filtrer les trades dont le P&L absolu est inférieur au seuil
        const pnlThreshold = userStore.user?.settings_object?.pnlThreshold || 0
        if (pnlThreshold > 0) {
            trades = trades.filter(t => Math.abs(t.netProfit || 0) >= pnlThreshold)
        }

        // Stocker dans le store non-persistant (memoire uniquement)
        dataStore.lastTrades = trades

        // Métriques existantes - utiliser useNet pour basculer entre net et brut
        dataStore.dashboardResult.pnl = getPNL(trades, 0, useNet)
        dataStore.dashboardResult.appt = getAPPT(trades, true, 2, useNet)
        dataStore.dashboardResult.plRatio = getPLRatio(trades, 2, useNet)
        dataStore.dashboardResult.winrate = getWinrate(trades, 2, useNet)
        dataStore.dashboardResult.profitFactor = getProfitFactor(trades, 2, useNet)
        const sortedByClose = sortTradesByCloseDate(trades)
        dataStore.dashboardResult.recoveryFactor = getRecoveryFactor(sortedByClose, 2, useNet)
        dataStore.dashboardResult.sharpeRatio = getSharpeRatio(trades, 0, 2, useNet)
        dataStore.dashboardResult.sortinoRatio = getSortinoRatio(trades, 0, 2, useNet)
        dataStore.dashboardResult.calmarRatio = getCalmarRatio(sortedByClose, 2, useNet)
        dataStore.dashboardResult.ulcerIndex = getUlcerIndex(sortedByClose, 2, useNet)
        dataStore.dashboardResult.tradesCount = trades.length

        // ALL TRADES - Nouvelles métriques
        dataStore.dashboardResult.grossPnl = getPNL(trades, 2, useNet)
        dataStore.dashboardResult.totalContracts = getTotalContracts(trades)
        dataStore.dashboardResult.avgTradeDuration = getAvgTradeDuration(trades, 2)
        dataStore.dashboardResult.maxTradeDuration = getMaxTradeDuration(trades, 2)
        dataStore.dashboardResult.expectancy = getExpectancy(trades, 2, useNet)
        dataStore.dashboardResult.totalCommission = trades.reduce((sum, t) => sum + (t.commission || 0), 0)

        // PROFIT TRADES
        const winMetrics = getWinningTradesMetrics(trades, useNet)
        dataStore.dashboardResult.totalProfit = winMetrics.totalProfit
        dataStore.dashboardResult.winningTradesCount = winMetrics.count
        dataStore.dashboardResult.winningContractsCount = winMetrics.totalContracts
        dataStore.dashboardResult.largestWin = winMetrics.largest
        dataStore.dashboardResult.avgWin = winMetrics.average
        dataStore.dashboardResult.stdDevWin = winMetrics.stdDev
        dataStore.dashboardResult.avgWinDuration = winMetrics.avgDuration
        dataStore.dashboardResult.maxWinDuration = winMetrics.maxDuration
        dataStore.dashboardResult.winningTradesCommission = winMetrics.totalCommission

        // Max Run-up avec dates
        const runUpData = getMaxRunUpWithDates(sortedByClose, useNet)
        dataStore.dashboardResult.maxRunUp = runUpData.maxRunUp
        dataStore.dashboardResult.maxRunUpDateFrom = runUpData.dateFrom
        dataStore.dashboardResult.maxRunUpDateTo = runUpData.dateTo

        // LOSING TRADES
        const lossMetrics = getLosingTradesMetrics(trades, useNet)
        dataStore.dashboardResult.totalLoss = lossMetrics.totalLoss
        dataStore.dashboardResult.losingTradesCount = lossMetrics.count
        dataStore.dashboardResult.losingContractsCount = lossMetrics.totalContracts
        dataStore.dashboardResult.largestLoss = lossMetrics.largest
        dataStore.dashboardResult.avgLoss = lossMetrics.average
        dataStore.dashboardResult.stdDevLoss = lossMetrics.stdDev
        dataStore.dashboardResult.avgLossDuration = lossMetrics.avgDuration
        dataStore.dashboardResult.maxLossDuration = lossMetrics.maxDuration
        dataStore.dashboardResult.losingTradesCommission = lossMetrics.totalCommission

        // Max Drawdown avec dates
        const drawdownData = getMaxDrawdownWithDates(sortedByClose, useNet)
        dataStore.dashboardResult.maxDrawdown = drawdownData.maxDrawdown
        dataStore.dashboardResult.maxDrawdownDateFrom = drawdownData.dateFrom
        dataStore.dashboardResult.maxDrawdownDateTo = drawdownData.dateTo

        // BREAKEVEN TRADES
        const breakevenMetrics = getBreakevenTradesMetrics(trades)
        dataStore.dashboardResult.breakevenTradesCount = breakevenMetrics.count
        dataStore.dashboardResult.breakevenContractsCount = breakevenMetrics.totalContracts

        // STREAKS (trades triés par closeDate pour un calcul correct)
        dataStore.dashboardResult.maxWinningStreak = getMaxWinningStreak(sortedByClose, useNet)
        dataStore.dashboardResult.maxLosingStreak = getMaxLosingStreak(sortedByClose, useNet)

        // DAILY METRICS
        const dailyPnls = getDailyPnlArray(trades, useNet, userStore.settingsObject)
        dataStore.dashboardResult.totalTradingDays = getTotalTradingDays(dailyPnls)
        const businessDays = getBusinessDaysFromTrades(trades)
        dataStore.dashboardResult.tradeFrequency = businessDays > 0 ? trades.length / businessDays : 0
        dataStore.dashboardResult.winningDays = getWinningDaysCount(dailyPnls)
        dataStore.dashboardResult.losingDays = getLosingDaysCount(dailyPnls)
        dataStore.dashboardResult.breakevenDays = getBreakevenDaysCount(dailyPnls)
        dataStore.dashboardResult.maxConsecutiveWinningDays = getMaxConsecutiveWinningDays(dailyPnls)
        dataStore.dashboardResult.maxConsecutiveLosingDays = getMaxConsecutiveLosingDays(dailyPnls)
        dataStore.dashboardResult.winningWeeksPercent = getWinningWeeksPercent(trades, useNet, userStore.settingsObject)
        dataStore.dashboardResult.winningMonthsPercent = getWinningMonthsPercent(trades, useNet, userStore.settingsObject)
        dataStore.dashboardResult.averageDailyPnl = getAverageDailyPnl(dailyPnls, 2)
        dataStore.dashboardResult.averageWinningDayPnl = getAverageWinningDayPnl(dailyPnls, 2)
        dataStore.dashboardResult.averageLosingDayPnl = getAverageLosingDayPnl(dailyPnls, 2)

        const largestProfitableDay = getLargestProfitableDay(dailyPnls)
        dataStore.dashboardResult.largestProfitableDayPnl = largestProfitableDay?.pnl ?? 0
        dataStore.dashboardResult.largestProfitableDayDate = largestProfitableDay ? new Date(largestProfitableDay.date) : null

        const largestLosingDay = getLargestLosingDay(dailyPnls)
        dataStore.dashboardResult.largestLosingDayPnl = largestLosingDay?.pnl ?? 0
        dataStore.dashboardResult.largestLosingDayDate = largestLosingDay ? new Date(largestLosingDay.date) : null

        const dailyDrawdown = getDailyMaxDrawdownWithPercent(dailyPnls, 2)
        dataStore.dashboardResult.dailyMaxDrawdown = dailyDrawdown.maxDrawdown
        dataStore.dashboardResult.dailyMaxDrawdownPercent = dailyDrawdown.maxDrawdownPercent
        dataStore.dashboardResult.averageDrawdown = getAverageDrawdown(dailyPnls, 2)
        dataStore.dashboardResult.averageDrawdownPercent = getAverageDrawdownPercent(dailyPnls, 2)

        // R-MULTIPLE METRICS
        // Le R-multiple est calculé depuis le stopLoss (ratio de prix) ou par hypothèse (perte = SL touché)
        // Pas besoin de plannedRisk manuel — voir docs/dev/rr-design.md
        const rTrades = trades as unknown as RMultipleTrade[]
        const reliability = getRMultipleReliability(rTrades)
        const coverage = getRMultipleCoverage(rTrades)
        const withSlCount = countTradesWithStopLoss(rTrades)
        dataStore.dashboardResult.rMultipleCoverage = Math.round(coverage * 100)
        dataStore.dashboardResult.rMultipleReliability = reliability
        dataStore.dashboardResult.tradesWithStopLoss = withSlCount

        const rMultiples = getRMultiples(rTrades, useNet)
        if (rMultiples.length === 0 || reliability === 'none') {
            dataStore.dashboardResult.totalR = null
            dataStore.dashboardResult.apptR = null
            dataStore.dashboardResult.profitFactorR = null
            dataStore.dashboardResult.plRatioR = null
            dataStore.dashboardResult.avgWinR = null
            dataStore.dashboardResult.avgLossR = null
            dataStore.dashboardResult.largestWinR = null
            dataStore.dashboardResult.largestLossR = null
            dataStore.dashboardResult.totalProfitR = null
            dataStore.dashboardResult.totalLossR = null
            dataStore.dashboardResult.tradesWithRMultiple = 0
            dataStore.dashboardResult.sqn = 0
        } else {
            dataStore.dashboardResult.totalR = getTotalRMultiple(rTrades, 2, useNet)
            dataStore.dashboardResult.apptR = getAPPTInR(rTrades, 2, useNet)
            dataStore.dashboardResult.profitFactorR = getProfitFactorInR(rTrades, 2, useNet)
            dataStore.dashboardResult.plRatioR = getPLRatioInR(rTrades, 2, useNet)
            const avgWinLossR = getAvgWinLossInR(rTrades, 2, useNet)
            dataStore.dashboardResult.avgWinR = avgWinLossR.avgWin
            dataStore.dashboardResult.avgLossR = avgWinLossR.avgLoss
            const largestWinLossR = getLargestWinLossInR(rTrades, 2, useNet)
            dataStore.dashboardResult.largestWinR = largestWinLossR.largestWin
            dataStore.dashboardResult.largestLossR = largestWinLossR.largestLoss
            const totalProfitLossR = getTotalProfitLossInR(rTrades, 2, useNet)
            dataStore.dashboardResult.totalProfitR = totalProfitLossR.totalProfit
            dataStore.dashboardResult.totalLossR = totalProfitLossR.totalLoss
            dataStore.dashboardResult.tradesWithRMultiple = rMultiples.length
            // SQN nécessite les R-multiples (Van Tharp)
            dataStore.dashboardResult.sqn = getSQN(rMultiples, 2)
        }

        return trades
    }

    const clearLastTrades = () => {
        dataStore.lastTrades = []
    }

    return {
        accounts,
        dashBoardLastTrades: computed(() => dataStore.lastTrades),
        dashBoardResult: computed(() => dataStore.dashboardResult),
        fetchAccounts,
        fetchData,
        clearLastTrades
    }
}
