// Interfaces et types pour l'application Trading Journal
// Les types principaux ont été déplacés vers les schémas Zod correspondants :
// - TradeType -> schema/trade.ts
// - ConfigSymbol -> schema/symbol.ts
interface ILogView {
    onClose: () => void
    onOpen: () => void
    isOpen: () => boolean
    debug: (str: string) => void
    info: (str: string) => void
    warn: (str: string) => void
    error: (str: string) => void
}

type ErrorMessage = {
    message?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
};

export type {
    ILogView,
    ErrorMessage
}

export type TradeFilterValue = number | string | [number, number, number] | number[] | undefined

export type TradeFilter = { column: string, operator: string, value: TradeFilterValue }
