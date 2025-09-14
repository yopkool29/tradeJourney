import z from 'zod'
import { TradeTagAssociationSchema } from '~/schema/trade'
import type { TradeTagAssociationType, UpdateTradeExtendedType } from '~/schema/trade'

export function useTradeTags() {
    // Récupérer les tags d'un trade spécifique
    const getTradeTagsByTradeId = async (tradeId: number) => {
        const result = await $fetch<TradeTagAssociationType[]>(`/api/trades/${tradeId}/tags`)
        return z.array(TradeTagAssociationSchema).parse(result)
    }

    // Mettre à jour les tags d'un trade
    const updateTradeTags = async (tradeId: number, data: UpdateTradeExtendedType) => {
        const result = await $fetch<UpdateTradeExtendedType>(`/api/trades/${tradeId}/tags`, {
            method: 'PATCH',
            body: data
        })
        
        return result
    }

    const deleteTradeTags = async (tradeId: number) => {
        await $fetch(`/api/trades/${tradeId}/tags`, {
            method: 'DELETE'
        })
    }


    return {
        getTradeTagsByTradeId,
        updateTradeTags,
        deleteTradeTags
    }
}
