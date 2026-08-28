import type { AccountType } from '~/schema/account'
import type { TradeFilter } from '~/type'
import { transformAdvancedFilters } from '~/utils/filter-utils'
import { calculateTradePerformance } from '~/utils/tradePerformance'
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

        const performance = calculateTradePerformance(trades, { useNet, round: 2, pnlRound: 0 })

        // Métriques existantes - utiliser useNet pour basculer entre net et brut
        dataStore.dashboardResult.pnl = performance.pnl
        dataStore.dashboardResult.appt = performance.appt
        dataStore.dashboardResult.plRatio = performance.plRatio
        dataStore.dashboardResult.winrate = performance.winrate
        dataStore.dashboardResult.profitFactor = performance.profitFactor
        dataStore.dashboardResult.recoveryFactor = performance.recoveryFactor
        dataStore.dashboardResult.sharpeRatio = performance.sharpeRatio
        dataStore.dashboardResult.sortinoRatio = performance.sortinoRatio
        dataStore.dashboardResult.calmarRatio = performance.calmarRatio
        dataStore.dashboardResult.ulcerIndex = performance.ulcerIndex
        dataStore.dashboardResult.tradesCount = performance.tradesCount

        // ALL TRADES - Nouvelles métriques
        dataStore.dashboardResult.grossPnl = performance.grossPnl
        dataStore.dashboardResult.totalContracts = performance.totalContracts
        dataStore.dashboardResult.avgTradeDuration = performance.avgTradeDuration
        dataStore.dashboardResult.maxTradeDuration = performance.maxTradeDuration
        dataStore.dashboardResult.expectancy = performance.expectancy
        dataStore.dashboardResult.totalCommission = performance.totalCommission

        // PROFIT TRADES
        dataStore.dashboardResult.totalProfit = performance.winning.totalProfit
        dataStore.dashboardResult.winningTradesCount = performance.winning.count
        dataStore.dashboardResult.winningContractsCount = performance.winning.totalContracts
        dataStore.dashboardResult.largestWin = performance.winning.largest
        dataStore.dashboardResult.avgWin = performance.winning.average
        dataStore.dashboardResult.stdDevWin = performance.winning.stdDev
        dataStore.dashboardResult.avgWinDuration = performance.winning.avgDuration
        dataStore.dashboardResult.maxWinDuration = performance.winning.maxDuration
        dataStore.dashboardResult.winningTradesCommission = performance.winning.totalCommission

        // Max Run-up avec dates
        dataStore.dashboardResult.maxRunUp = performance.runUp.maxRunUp
        dataStore.dashboardResult.maxRunUpDateFrom = performance.runUp.dateFrom
        dataStore.dashboardResult.maxRunUpDateTo = performance.runUp.dateTo

        // LOSING TRADES
        dataStore.dashboardResult.totalLoss = performance.losing.totalLoss
        dataStore.dashboardResult.losingTradesCount = performance.losing.count
        dataStore.dashboardResult.losingContractsCount = performance.losing.totalContracts
        dataStore.dashboardResult.largestLoss = performance.losing.largest
        dataStore.dashboardResult.avgLoss = performance.losing.average
        dataStore.dashboardResult.stdDevLoss = performance.losing.stdDev
        dataStore.dashboardResult.avgLossDuration = performance.losing.avgDuration
        dataStore.dashboardResult.maxLossDuration = performance.losing.maxDuration
        dataStore.dashboardResult.losingTradesCommission = performance.losing.totalCommission

        // Max Drawdown avec dates
        dataStore.dashboardResult.maxDrawdown = performance.drawdown.maxDrawdown
        dataStore.dashboardResult.maxDrawdownDateFrom = performance.drawdown.dateFrom
        dataStore.dashboardResult.maxDrawdownDateTo = performance.drawdown.dateTo

        // BREAKEVEN TRADES
        dataStore.dashboardResult.breakevenTradesCount = performance.breakeven.count
        dataStore.dashboardResult.breakevenContractsCount = performance.breakeven.totalContracts

        // STREAKS (trades triés par closeDate pour un calcul correct)
        dataStore.dashboardResult.maxWinningStreak = performance.maxWinningStreak
        dataStore.dashboardResult.maxLosingStreak = performance.maxLosingStreak

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
        dataStore.dashboardResult.rMultipleCoverage = Math.round(performance.r.coverage * 100)
        dataStore.dashboardResult.rMultipleReliability = performance.r.reliability
        dataStore.dashboardResult.tradesWithStopLoss = performance.r.tradesWithStopLoss
        dataStore.dashboardResult.totalR = performance.r.totalR
        dataStore.dashboardResult.apptR = performance.r.apptR
        dataStore.dashboardResult.profitFactorR = performance.r.profitFactorR
        dataStore.dashboardResult.plRatioR = performance.r.plRatioR
        dataStore.dashboardResult.avgWinR = performance.r.avgWinR
        dataStore.dashboardResult.avgLossR = performance.r.avgLossR
        dataStore.dashboardResult.largestWinR = performance.r.largestWinR
        dataStore.dashboardResult.largestLossR = performance.r.largestLossR
        dataStore.dashboardResult.totalProfitR = performance.r.totalProfitR
        dataStore.dashboardResult.totalLossR = performance.r.totalLossR
        dataStore.dashboardResult.tradesWithRMultiple = performance.r.tradesWithRMultiple
        // SQN nécessite les R-multiples (Van Tharp)
        dataStore.dashboardResult.sqn = performance.r.sqn

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
