import { z } from 'zod'
import type { SymbolType, CreateSymbolType, UpdateSymbolType } from '~/schema/symbol'
import { SymbolSchema } from '~/schema/symbol'

export const useSymbols = () => {
    const user = useUserStore()
    const symbols = ref<SymbolType[]>([])
    const digitFromSymbolCache: Record<string, number> = {}

    const fetchSymbols = async (): Promise<SymbolType[]> => {
        const result = await $fetch<SymbolType[]>('/api/config-symbols')
        symbols.value = z.array(SymbolSchema).parse(result)
        user.dailyHistoryFilters.symbols = [...symbols.value] // copy to store
        return symbols.value
    }

    const getDigitFromSymbol = (symbol: string, fromCache = false) => {
        if (fromCache) {
            symbols.value = user.dailyHistoryFilters.symbols
        }
        if (symbol in digitFromSymbolCache) {
            return digitFromSymbolCache[symbol]
        }
        const symbolInConfig = symbols.value.find(configSymbol => configSymbol.symbol === symbol)
        const digit = symbolInConfig?.digit !== undefined ? symbolInConfig.digit : 2
        digitFromSymbolCache[symbol] = digit
        return digit
    }

    const getPricePointFromSymbol = (symbol: string) => {
        const symbolInConfig = symbols.value.find(configSymbol => configSymbol.symbol === symbol)
        return symbolInConfig?.pricePerPoint || -1
    }

    const fetchActiveSymbols = async (): Promise<SymbolType[]> => {
        const result = await $fetch<SymbolType[]>('/api/config-symbols/active')

        symbols.value = z.array(SymbolSchema).parse(result)

        return symbols.value
    }

    const createSymbol = async (symbol: CreateSymbolType) => {
        const result = await $fetch<SymbolType>('/api/config-symbols', {
            method: 'POST',
            body: symbol
        })
        return SymbolSchema.parse(result)
    }

    const updateSymbol = async (updates: UpdateSymbolType) => {
        const result = await $fetch<SymbolType>(`/api/config-symbols`, {
            method: 'PATCH',
            body: updates
        })
        return SymbolSchema.parse(result)
    }

    const deleteSymbol = async (id: number) => {
        return await $fetch(`/api/config-symbols/${id}`, {
            method: 'DELETE'
        })
    }

    return {
        symbols,
        fetchSymbols,
        fetchActiveSymbols,
        getDigitFromSymbol,
        getPricePointFromSymbol,
        createSymbol,
        updateSymbol,
        deleteSymbol
    }
}
