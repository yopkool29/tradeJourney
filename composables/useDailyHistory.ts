import type { AccountType } from '~/schema/account'
import type { TradeFilter } from '~/type'

export const useDailyHistory = () => {

    const accounts = ref<AccountType[]>([])
    const { fetchTrades } = useTrades()
    const userStore = useUserStore()

    const fetchAccounts = async () => {
        await $fetch<AccountType[]>('/api/account').then((res) => {
            accounts.value = res
        })
    }

    const fetchData = async (startDate: Date | null, endDate: Date | null, includeEndDay: boolean, accountIds: number[] = []) => {
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

        userStore.dailyHistoryFilters.last_results = trades

        return trades
    }

    return {
        accounts,
        fetchAccounts,
        fetchData
    }
}
