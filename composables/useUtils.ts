import { formatCurrency as formatCurrencyUtil } from '~/utils'

export const useUtils = () => {
    const formatCurrency = (value: number | string, decimals: number = 2): string => {
        return formatCurrencyUtil(value, decimals, "USD")
    }

    return {
        formatCurrency : formatCurrency,
    }
}
