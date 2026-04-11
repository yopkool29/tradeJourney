import type { TradeExtendedType } from '~/schema/trade'

type OnSavedCallback = (note: string, tagIds: number[]) => void

const useTradeTagModal = () => {
    const trade = useState<TradeExtendedType | null>('tradeTagModal.trade', () => null)
    const onSavedCallback = useState<OnSavedCallback | null>('tradeTagModal.onSaved', () => null)

    const open = (tradeToEdit: TradeExtendedType, onSaved?: OnSavedCallback) => {
        onSavedCallback.value = onSaved ?? null
        trade.value = tradeToEdit
    }

    const close = () => {
        trade.value = null
    }

    const notifySaved = (note: string, tagIds: number[]) => {
        onSavedCallback.value?.(note, tagIds)
        close()
    }

    return { trade, open, close, notifySaved }
}

export default useTradeTagModal
