import type { AccountType } from '~/schema/account'
import type { TradeFilter } from '~/type'
import type { TradeExtendedType } from '~/schema/trade'

export const useDailyHistory = (storeKey: 'dailyHistoryFilters' | 'calendarFilters' = 'dailyHistoryFilters') => {

    const accounts = ref<AccountType[]>([])
    // Utiliser shallowRef pour les trades - pas besoin de réactivité profonde sur chaque propriété de trade
    const lastResults = shallowRef<TradeExtendedType[]>([])
    const { fetchTrades } = useTrades()
    const userStore = useUserStore()

    const fetchAccounts = async () => {
        accounts.value = await $fetch('/api/account') as AccountType[]
    }

    const fetchData = async (startDate: Date | null, endDate: Date | null, includeEndDay: boolean, accountIds: number[] = [], advancedFilters: TradeFilter[] = []) => {
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

        // Ajouter les filtres avancés (exclure ceux avec valeur vide)
        if (advancedFilters && advancedFilters.length > 0) {
            const validFilters = advancedFilters.filter(f => f.value !== '' && f.value !== null && f.value !== undefined)
            filtersForApi.push(...validFilters)
        }

        const showInactive = storeKey === 'dailyHistoryFilters' ? userStore.dailyHistoryFilters.showInactive : false

        const trades = await fetchTrades(filtersForApi, 1000, showInactive)

        // Stocker dans shallowRef (pas de réactivité profonde) et sync avec store
        lastResults.value = trades
        userStore[storeKey].last_results = trades

        return trades
    }

    return {
        accounts,
        lastResults,
        fetchAccounts,
        fetchData
    }
}
