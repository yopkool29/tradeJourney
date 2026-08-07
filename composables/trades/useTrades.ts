import z from 'zod'
import type { TradeExtendedType, TradeType, CreateTradeType, UpdateTradeType, ImportTypeResult, DeleteAccountTradesResult } from '~/schema/trade'
import { TradeExtendedShema, TradeSchema } from '~/schema/trade'

export const useTrades = () => {
    const userStore = useUserStore()
    const trades = ref<TradeExtendedType[]>([])
    const loading = ref(false)

    const fetchTrades = async (params = {}, limit = 1000, showInactive = false): Promise<TradeExtendedType[]> => {
        if (!userStore.user) return []
        loading.value = true
        try {
            const query: Record<string, string> = {
                filters: JSON.stringify(params),
                showInactive: showInactive.toString(),
                limit: limit.toString()
            }

            const result = await $fetch('/api/trades', { query })

            trades.value = z.array(TradeExtendedShema).parse(result)

            return trades.value
        } catch (error) {
            console.error('fetchTrades error:', error)
            return []
        } finally {
            loading.value = false
        }
    }

    const fetchTrade = async (id: number): Promise<TradeExtendedType | null> => {
        try {
            const result = await $fetch(`/api/trades/${id}`)
            return TradeExtendedShema.parse(result)
        } catch (error) {
            console.error('Erreur lors de la récupération du trade:', error)
            return null
        }
    }

    const updateTrade = async (trade: UpdateTradeType): Promise<TradeType> => {
        if (!trade.id) throw new Error('ID manquant pour la mise à jour')

        const result = await $fetch(`/api/trades/${trade.id}`, {
            method: 'patch',
            body: trade
        })

        return TradeSchema.parse(result)
    }

    const createTrade = async (trade: CreateTradeType): Promise<TradeType> => {

        const result = await $fetch('/api/trades', {
            method: 'post',
            body: trade
        })

        return TradeSchema.parse(result)
    }

    const deleteTrade = async (tradeId: number) => {
        return await $fetch(`/api/trades/${tradeId}`, {
            method: 'delete'
        })
    }

    const unDeleteTrade = async (tradeId: number) => {
        return await $fetch(`/api/trades/${tradeId}/undelete`, {
            method: 'patch'
        })
    }

    const deleteAccountTrades = async (accountId: number, deleteInactive?: boolean): Promise<DeleteAccountTradesResult> => {
        return await $fetch(`/api/trades/account/${accountId}`, {
            method: 'delete',
            body: { deleteInactive }
        })
    }

    const uploadMultipleScreenshots = async (tradeId: number, files: File[]): Promise<TradeType> => {
        const formData = new FormData()
        formData.append('tradeId', tradeId.toString())

        // Append each file to the formData with the same field name
        for (const file of files) {
            formData.append('screenshots', file)
        }

        return await $fetch('/api/trades/upload-screenshots', {
            method: 'post' as const,
            body: formData
        })
    }

    /**
     * Supprime les screenshots spécifiés d'un trade
     * @param tradeId ID du trade
     * @param screenshotIds IDs des screenshots à supprimer
     * @returns Le trade mis à jour
     */
    const deleteScreenshots = async (tradeId: number, screenshotIds: number[]): Promise<TradeType> => {
        return await $fetch(`/api/trades/${tradeId}/screenshots`, {
            method: 'delete',
            body: { screenshotIds }
        })
    }

    const importTrades = async (formData: FormData): Promise<ImportTypeResult> => {
        return await $fetch('/api/import', {
            method: 'post',
            body: formData
        })
    }

    const tradeCount = useState<number>('tradeCount', () => 0)
    const config = useRuntimeConfig()
    const tradeCountThreshold = config.public.tradeCountThreshold

    const fetchFilteredTradeCount = async (params = {}, showInactive = false): Promise<number> => {
        if (!userStore.user) return 0
        const query: Record<string, string> = {
            count: 'true',
            filters: JSON.stringify(params),
            showInactive: showInactive.toString(),
        }
        const result = await $fetch<{ count: number }>('/api/trades', { query })
        tradeCount.value = result.count
        return result.count
    }

    const fetchTradesDateRange = async (accountIds: number[] | null): Promise<{ minDate: string | null, maxDate: string | null }> => {
        const result = await $fetch<{ minDate: string | null, maxDate: string | null }>('/api/trades/date-range', {
            query: { accountIds: JSON.stringify(accountIds) },
        })
        return result
    }

    const isAutoApplyMode = computed(() => tradeCount.value < tradeCountThreshold)

    return {
        trades,
        loading,
        fetchTrades,
        fetchTrade,
        updateTrade,
        createTrade,
        deleteTrade,
        unDeleteTrade,
        deleteAccountTrades,
        uploadMultipleScreenshots,
        deleteScreenshots,
        importTrades,
        fetchFilteredTradeCount,
        fetchTradesDateRange,
        tradeCount,
        isAutoApplyMode
    }
}
