import z from 'zod'
import type { TradeExtendedType, TradeType, CreateTradeType, UpdateTradeType, ImportTypeResult, DeleteAccountTradesResult } from '~/schema/trade'
import { TradeExtendedShema, TradeSchema } from '~/schema/trade'

export const useTrades = () => {
    const trades = ref<TradeExtendedType[]>([])
    const loading = ref(false)

    const fetchTrades = async (params = {}, limit = -1, showInactive = false): Promise<TradeExtendedType[]> => {
        loading.value = true
        try {
            const query = { filters: JSON.stringify(params), showInactive }
            let result = await $fetch<TradeExtendedType[]>('/api/trades', { query })
            if (limit > 0)
                result = result.slice(0, limit)

            trades.value = z.array(TradeExtendedShema).parse(result)

            return trades.value
        } catch {
            return []
        } finally {
            loading.value = false
        }
    }

    const fetchTrade = async (id: number): Promise<TradeExtendedType | null> => {
        try {
            const result = await $fetch<TradeExtendedType>(`/api/trades/${id}`)
            return TradeExtendedShema.parse(result)
        } catch (error) {
            console.error('Erreur lors de la récupération du trade:', error)
            return null
        }
    }

    const updateTrade = async (trade: UpdateTradeType): Promise<TradeType> => {
        if (!trade.id) throw new Error('ID manquant pour la mise à jour')

        const result = await $fetch<TradeType>(`/api/trades/${trade.id}`, {
            method: 'patch',
            body: trade
        })

        return TradeSchema.parse(result)
    }

    const createTrade = async (trade: CreateTradeType): Promise<TradeType> => {

        const result = await $fetch<TradeType>('/api/trades', {
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
        return await $fetch<DeleteAccountTradesResult>(`/api/trades/account/${accountId}`, {
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

        return await $fetch<TradeType>('/api/trades/upload-screenshots', {
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
        return await $fetch<TradeType>(`/api/trades/${tradeId}/screenshots`, {
            method: 'delete',
            body: { screenshotIds }
        })
    }

    const importTrades = async (formData: FormData): Promise<ImportTypeResult> => {
        return await $fetch<ImportTypeResult>('/api/import', {
            method: 'post',
            body: formData
        })
    }

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
        importTrades
    }
}
