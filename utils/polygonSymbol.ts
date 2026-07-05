import { InstrumentType } from '~/type'
import type { SymbolType } from '~/schema/symbol'

export interface PolygonBar {
    time: number
    open: number
    high: number
    low: number
    close: number
}

// Read the 'spgn' custom field from a symbol's metadata, if defined.
// This is the explicit Polygon ticker alias for symbols that don't map automatically.
export const getSpgnAlias = (symbolConfig: SymbolType | undefined): string | null => {
    const customFields = symbolConfig?.metadata?.customFields
    if (!customFields) return null
    const spgnField = customFields.find(f => f.key === 'spgn')
    return spgnField?.value || null
}

// Common futures base symbols (CME micro/e-mini, commodities, etc.)
const futuresBaseSymbols = [
    'ES', 'MES', 'NQ', 'MNQ', 'YM', 'MYM', 'RTY', 'M2K', 'CL', 'MCL',
    'GC', 'MGC', 'SI', 'SIL', 'HG', 'PL', 'NG', 'ZB', 'ZN', 'ZT',
    'ZF', 'UB', 'ZC', 'ZS', 'ZW', 'ZL', 'LE', 'HE', 'GF', 'CC', 'KC',
    'SB', 'CT', 'OJ', 'LC', 'FC', '6E', '6B', '6J', '6A', '6C', '6S',
    'M6E', 'M6B', 'M6J', 'M6A', 'M6C', 'M6S',
]
const futuresBaseSet = new Set(futuresBaseSymbols)
const futuresWithExpPattern = new RegExp(
    `^(${futuresBaseSymbols.join('|')})[FGHJKMNQUVXZ]\\d{1,2}$`,
)

// Check if a symbol looks like a futures ticker (with or without expiration code).
export const isFuturesSymbol = (symbol: string): boolean => {
    const upper = symbol.toUpperCase()
    return futuresWithExpPattern.test(upper) || futuresBaseSet.has(upper)
}

// Heuristic conversion from a trade symbol + instrument type to a Polygon ticker.
// Returns null when the symbol cannot be mapped automatically.
const autoConvert = (symbol: string, instrumentType: InstrumentType): string | null => {
    const upper = symbol.toUpperCase()

    switch (instrumentType) {
        case InstrumentType.Forex: {
            // Common metal aliases mapped to their Forex pairs
            const metalMap: Record<string, string> = {
                GOLD: 'XAUUSD',
                SILVER: 'XAGUSD',
                XAU: 'XAUUSD',
                XAG: 'XAGUSD',
            }
            const mapped = metalMap[upper]
            if (mapped) return `C:${mapped}`
            // Forex pairs are 6 letters (e.g. EURUSD). Polygon prefix is "C:".
            if (upper.length === 6 && /^[A-Z]{6}$/.test(upper)) {
                return `C:${upper}`
            }
            return null
        }

        case InstrumentType.Crypto: {
            // Crypto: Polygon uses "X:BASEQUOTE". Common quote currencies: USD, USDT, EUR, BTC, ETH.
            // USDT is normalised to USD since Polygon doesn't list USDT pairs.
            const quoteMatch = upper.match(/^(.+?)(USDT|USD|EUR|BTC|ETH)$/)
            if (quoteMatch) {
                const base = quoteMatch[1]
                const quote = quoteMatch[2] === 'USDT' ? 'USD' : quoteMatch[2]
                return `X:${base}${quote}`
            }
            return null
        }

        case InstrumentType.Stock: {
            // Stocks are bare tickers on Polygon (e.g. AAPL, MSFT).
            return upper
        }

        case InstrumentType.Future: {
            // Futures use a dedicated Polygon API at /futures/v1/aggs/{ticker} with no prefix.
            // The trade symbol (e.g. ESZ5, GCJ5, MESZ5) is already the Polygon ticker.
            return upper
        }

        case InstrumentType.Option: {
            // Polygon options use the "O:" prefix followed by the OCC symbol
            // (e.g. O:AAPL240315C00150000). Brokers typically provide the OCC
            // symbol without the prefix, so we just prepend "O:".
            if (upper.startsWith('O:')) return upper
            return `O:${upper}`
        }

        default: {
            // InstrumentType.Any: detect futures by symbol pattern.
            if (isFuturesSymbol(upper)) {
                return upper
            }
            return null
        }
    }
}

// Convert a trade symbol to a Polygon ticker.
// Priority: explicit 'spgn' alias > automatic conversion by instrument type.
// Returns null if no mapping is possible (the chart will be skipped).
export const tradeToPolygonSymbol = (
    symbol: string,
    instrumentType: InstrumentType,
    symbolConfig: SymbolType | undefined,
): string | null => {
    const alias = getSpgnAlias(symbolConfig)
    if (alias) return alias

    return autoConvert(symbol, instrumentType)
}
