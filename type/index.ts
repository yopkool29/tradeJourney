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

export type TradeFilterValue = number | string | [number, number, number] | number[] | string[] | undefined

export type TradeFilter = { column: string, operator: string, value: TradeFilterValue }

export enum InstrumentType {
    Stock = 'stock',
    Future = 'future',
    Forex = 'forex',
    Option = 'option',
    Crypto = 'crypto',
    Any = 'any'
}

export interface FilterColumn {
    label: string
    value: string
    dataType?: 'text' | 'number' | 'date' | 'select'
    operators?: string[]
    defaultOperator?: string
    defaultValue?: any
}

// Store types
export interface CustomInput {
    items: string[]
    value: string
}

export interface CustomInputs {
    [key: string]: CustomInput
}

export type ReportType = 'mt5' | 'nt8' | 'quantower' | 'ibkr' | 'ibkr-api' | 'standard'

export interface ImportOptions {
    timezoneType: Record<ReportType, string>
    timezone: string
    reportType: ReportType
    keepExistingTrades: boolean
    importModes: Record<ReportType, 'local' | 'utc'>
    timezoneUtcValues: Record<ReportType, string>
    dayTagIds: Record<ReportType, number[]>
    tradeTagIds: Record<ReportType, number[]>
}

export interface TradeOptions {
    accountIds: number[]
    nbLines: number
    showInactive: boolean
    showAdvancedFilters: boolean
    filters: TradeFilter[]
    lastFilterColumn: string
}

export type ChartKey = 'pnlBar' | 'cumulatedPnl' | 'appt' | 'winrate'
export type SectionKey = 'allTrades' | 'profitTrades' | 'losingTrades' | 'winLossComparison'

export interface DashboardGridItem {
    x: number
    y: number
    w: number
    h: number
    i: string
}

export interface DashBoardFilters {
    accountIds: number[]
    period: string
    startDate: Date
    endDate: Date
    customStartDate: Date
    customEndDate: Date
    cumuleMode: string
    showInactive: boolean
    showAdvancedFilters: boolean
    filters: TradeFilter[]
    lastFilterColumn: string
    dashboardChartVisibility: Record<ChartKey, boolean>
    dashboardSectionVisibility: Record<SectionKey, boolean>
    dashboardGridLayout: DashboardGridItem[]
}

export interface DailyFilters {
    accountIds: number[]
    selectedMonth: string
    showInactive: boolean
    isExpanded: boolean
    showAdvancedFilters: boolean
    columnVisibility: Record<string, boolean>
    filters: TradeFilter[]
    lastFilterColumn: string
}

export interface CalendarFilters {
    accountIds: number[]
    selectedMonth: string
    showInactive: boolean
    showAdvancedFilters: boolean
    filters: TradeFilter[]
    lastFilterColumn: string
}

export interface DashBoardResult {
    pnl: number
    appt: number
    plRatio: number
    winrate: number
    profitFactor: number
    recoveryFactor: number
    sharpeRatio: number
    tradesCount: number
    grossPnl: number
    totalContracts: number
    avgTradeDuration: number
    maxTradeDuration: number
    expectancy: number
    totalCommission: number
    totalProfit: number
    winningTradesCount: number
    winningContractsCount: number
    largestWin: number
    avgWin: number
    stdDevWin: number
    avgWinDuration: number
    maxWinDuration: number
    winningTradesCommission: number
    maxRunUp: number
    maxRunUpDateFrom: Date | null
    maxRunUpDateTo: Date | null
    maxWinningStreak: number
    totalLoss: number
    losingTradesCount: number
    losingContractsCount: number
    largestLoss: number
    avgLoss: number
    stdDevLoss: number
    avgLossDuration: number
    maxLossDuration: number
    losingTradesCommission: number
    maxDrawdown: number
    maxDrawdownDateFrom: Date | null
    maxDrawdownDateTo: Date | null
    maxLosingStreak: number
    breakevenTradesCount: number
    breakevenContractsCount: number
}

import { IANA_TIMEZONES, UTC_OFFSETS } from '~/utils/date-utils';

// Type pour les fuseaux horaires IANA valides
export type IANATimezone = typeof IANA_TIMEZONES[number];

// Type pour les offsets UTC valides (ex: "UTC+2", "UTC-5")
export type UTCOffset = `${typeof UTC_OFFSETS[number]}`;

// Type unifié pour l'entrée du fuseau horaire
export type TimezoneInput = IANATimezone | UTCOffset;

/**
 * Type guard pour valider si une chaîne est un TimezoneInput valide.
 */
export function isTimezoneInput(value: string): value is TimezoneInput {
    // Vérifie si c'est un IANA timezone valide
    if ((IANA_TIMEZONES as readonly string[]).includes(value)) {
        return true;
    }

    // Vérifie si c'est un offset UTC valide (ex: "-5", "0", "2")
    const offset = parseInt(value, 10);
    if (!isNaN(offset) && offset >= -12 && offset <= 14) {
        return (UTC_OFFSETS as readonly number[]).includes(offset);
    }

    return false;
}

