import type { TradeExtendedType } from '~/schema/trade'

export const useTradeNote = () => {
    const { updateTrade } = useTrades()

    const getDetailedNote = (trade: TradeExtendedType | null): string => {
        return (trade?.metadata as Record<string, unknown>)?.detailedNote as string || ''
    }

    const saveDetailedNote = async (tradeId: number, content: string) => {
        return await updateTrade({ id: tradeId, detailedNote: content })
    }

    const clearDetailedNote = async (tradeId: number) => {
        return await updateTrade({ id: tradeId, detailedNote: '' })
    }

    return {
        getDetailedNote,
        saveDetailedNote,
        clearDetailedNote,
    }
}
