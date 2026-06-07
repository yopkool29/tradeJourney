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
    getMaxLosingStreak
} from '~/utils/tradeStats'

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
        dataStore.dashboardResult.recoveryFactor = getRecoveryFactor(trades, 2, useNet)
        dataStore.dashboardResult.sharpeRatio = getSharpeRatio(trades, 0, 2, useNet)
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
        const runUpData = getMaxRunUpWithDates(trades, useNet)
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
        const drawdownData = getMaxDrawdownWithDates(trades)
        dataStore.dashboardResult.maxDrawdown = drawdownData.maxDrawdown
        dataStore.dashboardResult.maxDrawdownDateFrom = drawdownData.dateFrom
        dataStore.dashboardResult.maxDrawdownDateTo = drawdownData.dateTo

        // BREAKEVEN TRADES
        const breakevenMetrics = getBreakevenTradesMetrics(trades)
        dataStore.dashboardResult.breakevenTradesCount = breakevenMetrics.count
        dataStore.dashboardResult.breakevenContractsCount = breakevenMetrics.totalContracts

        // STREAKS (trades triés par closeDate pour un calcul correct)
        const sortedByClose = [...trades].sort((a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime())
        dataStore.dashboardResult.maxWinningStreak = getMaxWinningStreak(sortedByClose)
        dataStore.dashboardResult.maxLosingStreak = getMaxLosingStreak(sortedByClose)

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
