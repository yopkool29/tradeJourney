import type { AccountType } from '~/schema/account'
import type { TradeFilter } from '~/type'
import type { TradeExtendedType } from '~/schema/trade'
import { transformAdvancedFilters } from '~/utils/filter-utils'

export const useDailyHistory = (storeKey: 'dailyFilters' | 'calendarFilters' = 'dailyFilters') => {

    const accounts = ref<AccountType[]>([])
   
    const { fetchTrades } = useTrades()
    const dataStore = useDataStore()
    const userStore = useUserStore()

    const dailyLastTrades = computed(() => dataStore.dailyLastTrades)
    const calendarLastTrades = computed(() => dataStore.calendarLastTrades)

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
            filtersForApi.push(...transformAdvancedFilters(advancedFilters))
        }

        const showInactive = storeKey === 'dailyFilters' ? userStore.dailyFilters.showInactive : false

        const trades = await fetchTrades(filtersForApi, 1000, showInactive)

        // Stocker dans useDataStore (non-persiste, memoire uniquement)
        if (storeKey === 'dailyFilters') {
            dataStore.dailyLastTrades = trades
        } else {
            dataStore.calendarLastTrades = trades
        }

        return trades
    }

    const clearLastTrades = () => {
        if (storeKey === 'dailyFilters') {
            dataStore.dailyLastTrades = []
        } else {
            dataStore.calendarLastTrades = []
        }
    }

    return {
        accounts,
        dailyLastTrades,
        calendarLastTrades,
        fetchAccounts,
        fetchData,
        clearLastTrades
    }
}
