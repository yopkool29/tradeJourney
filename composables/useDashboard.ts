import type { AccountType } from '~/schema/account'
import type { TradeFilter } from '~/type'
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

export const useDashboard = () => {

    const accounts = ref<AccountType[]>([])
    const { fetchTrades } = useTrades()
    const userStore = useUserStore()

    const fetchAccounts = async () => {
        await $fetch('/api/account').then((res) => {
            accounts.value = res as AccountType[]
        })
    }

    const fetchDashboardData = async (startDate: Date | null, endDate: Date | null, includeEndDay: boolean, accountIds: number[] = []) => {
        const _startDate = startDate ? startDate.getTime() : null
        const _endDate = endDate ? endDate.getTime() : null

        const filtersForApi: TradeFilter[] = []
        if (_startDate) {
            filtersForApi.push({ column: 'closeDate', operator: '>=', value: _startDate })
        }
        if (_endDate) {
            const operator = includeEndDay ? '<=' : '<'
            filtersForApi.push({ column: 'closeDate', operator: operator, value: _endDate })
        }
        
        // Gestion des comptes sélectionnés
        if (accountIds && accountIds.length > 0) {
            // Si un seul compte est sélectionné, on utilise l'opérateur '=' pour la compatibilité
            if (accountIds.length === 1) {
                filtersForApi.push({ column: 'accountId', operator: '=', value: accountIds[0] })
            } else {
                // Pour plusieurs comptes, on utilise l'opérateur 'in'
                filtersForApi.push({ 
                    column: 'accountId', 
                    operator: 'in', 
                    value: accountIds 
                })
            }
        }

        let trades = await fetchTrades(filtersForApi, -1)

        // Filtrer les trades dont le P&L absolu est inférieur au seuil
        const pnlThreshold = userStore.user?.settings_object?.pnlThreshold || 0
        if (pnlThreshold > 0) {
            trades = trades.filter(t => Math.abs(t.profit) >= pnlThreshold)
        }

        userStore.dashBoardFilters.last_results = trades

        // Métriques existantes
        userStore.dashBoardResult.pnl = getPNL(trades, 0)
        userStore.dashBoardResult.appt = getAPPT(trades, true, 2)
        userStore.dashBoardResult.plRatio = getPLRatio(trades, 2)
        userStore.dashBoardResult.winrate = getWinrate(trades, 2)
        userStore.dashBoardResult.profitFactor = getProfitFactor(trades, 2)
        userStore.dashBoardResult.recoveryFactor = getRecoveryFactor(trades, 2)
        userStore.dashBoardResult.sharpeRatio = getSharpeRatio(trades, 2)
        userStore.dashBoardResult.tradesCount = trades.length

        // ALL TRADES - Nouvelles métriques
        userStore.dashBoardResult.grossPnl = getPNL(trades, 2)
        userStore.dashBoardResult.totalContracts = getTotalContracts(trades)
        userStore.dashBoardResult.avgTradeDuration = getAvgTradeDuration(trades, 2)
        userStore.dashBoardResult.maxTradeDuration = getMaxTradeDuration(trades, 2)
        userStore.dashBoardResult.expectancy = getExpectancy(trades, 2)

        // PROFIT TRADES
        const winMetrics = getWinningTradesMetrics(trades)
        userStore.dashBoardResult.totalProfit = winMetrics.totalProfit
        userStore.dashBoardResult.winningTradesCount = winMetrics.count
        userStore.dashBoardResult.winningContractsCount = winMetrics.totalContracts
        userStore.dashBoardResult.largestWin = winMetrics.largest
        userStore.dashBoardResult.avgWin = winMetrics.average
        userStore.dashBoardResult.stdDevWin = winMetrics.stdDev
        userStore.dashBoardResult.avgWinDuration = winMetrics.avgDuration
        userStore.dashBoardResult.maxWinDuration = winMetrics.maxDuration

        // Max Run-up avec dates
        const runUpData = getMaxRunUpWithDates(trades)
        userStore.dashBoardResult.maxRunUp = runUpData.maxRunUp
        userStore.dashBoardResult.maxRunUpDateFrom = runUpData.dateFrom
        userStore.dashBoardResult.maxRunUpDateTo = runUpData.dateTo

        // LOSING TRADES
        const lossMetrics = getLosingTradesMetrics(trades)
        userStore.dashBoardResult.totalLoss = lossMetrics.totalLoss
        userStore.dashBoardResult.losingTradesCount = lossMetrics.count
        userStore.dashBoardResult.losingContractsCount = lossMetrics.totalContracts
        userStore.dashBoardResult.largestLoss = lossMetrics.largest
        userStore.dashBoardResult.avgLoss = lossMetrics.average
        userStore.dashBoardResult.stdDevLoss = lossMetrics.stdDev
        userStore.dashBoardResult.avgLossDuration = lossMetrics.avgDuration
        userStore.dashBoardResult.maxLossDuration = lossMetrics.maxDuration

        // Max Drawdown avec dates
        const drawdownData = getMaxDrawdownWithDates(trades)
        userStore.dashBoardResult.maxDrawdown = drawdownData.maxDrawdown
        userStore.dashBoardResult.maxDrawdownDateFrom = drawdownData.dateFrom
        userStore.dashBoardResult.maxDrawdownDateTo = drawdownData.dateTo

        // BREAKEVEN TRADES
        const breakevenMetrics = getBreakevenTradesMetrics(trades)
        userStore.dashBoardResult.breakevenTradesCount = breakevenMetrics.count
        userStore.dashBoardResult.breakevenContractsCount = breakevenMetrics.totalContracts

        // STREAKS (trades triés par closeDate pour un calcul correct)
        const sortedByClose = [...trades].sort((a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime())
        userStore.dashBoardResult.maxWinningStreak = getMaxWinningStreak(sortedByClose)
        userStore.dashBoardResult.maxLosingStreak = getMaxLosingStreak(sortedByClose)

        return trades
    }

    return {
        accounts,
        fetchAccounts,
        fetchDashboardData
    }
}
