import type { AccountType } from '~/schema/account'
import type { TradeFilter } from '~/type'
import { getPNL, getAPPT, getPLRatio, getWinrate } from '~/utils/tradeStats'

export const useDashboard = () => {

    const accounts = ref<AccountType[]>([])
    const { fetchTrades } = useTrades()
    const userStore = useUserStore()

    const fetchAccounts = async () => {
        await $fetch<AccountType[]>('/api/account').then((res) => {
            accounts.value = res
        })
    }

    const fetchDashboardData = async (startDate: Date | null, endDate: Date | null, includeEndDay: boolean, accountIds: number[] = []) => {
        const _startDate = startDate ? startDate.getTime() : null
        const _endDate = endDate ? endDate.getTime() : null

        const filtersForApi: TradeFilter[] = []
        if (_startDate) {
            filtersForApi.push({ column: 'openDate', operator: '>=', value: _startDate })
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

        const trades = await fetchTrades(filtersForApi)

        userStore.dashBoardFilters.last_results = trades

        userStore.dashBoardResult.pnl = getPNL(trades, 0)
        userStore.dashBoardResult.appt = getAPPT(trades, true, 2)
        userStore.dashBoardResult.plRatio = getPLRatio(trades, 2)
        userStore.dashBoardResult.winrate = getWinrate(trades, 2)
        userStore.dashBoardResult.profitFactor = getProfitFactor(trades, 2)
        userStore.dashBoardResult.recoveryFactor = getRecoveryFactor(trades, 2)
        userStore.dashBoardResult.sharpeRatio = getSharpeRatio(trades, 2)

        return trades
    }

    return {
        accounts,
        fetchAccounts,
        fetchDashboardData
    }
}
