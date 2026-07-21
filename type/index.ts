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

export type ChartKey = 'pnlBar' | 'cumulatedPnl' | 'appt' | 'winrate' | 'breakdownBar' | 'breakdownScatter' | 'breakdownTable' | 'hourlyHeatmap' | 'hourlyWinrate' | 'dayOfWeekPnl'
export type SectionKey = 'allTrades' | 'profitTrades' | 'losingTrades' | 'winLossComparison' | 'riskRatios' | 'dayStatistics'

// Préfixes des types de breakdown (base key sans l'ID d'instance)
export type BreakdownBaseKey = 'breakdownBar' | 'breakdownScatter' | 'breakdownTable'

// Dimensions disponibles pour les breakdowns configurables
export type BreakdownDimension = 'ticker' | 'tag' | 'side' | 'month' | 'dayOfWeek' | 'hour' | 'account'

// Métriques mesurables sur un breakdown
export type BreakdownMetric = 'pnl' | 'winrate' | 'profitFactor' | 'avgWin' | 'avgLoss' | 'expectancy' | 'avgDuration' | 'drawdown' | 'currentDrawdown' | 'tradesCount'

// Types de charts disponibles pour les breakdowns
export type BreakdownChartType = 'bar' | 'scatter' | 'table'

// Génère une clé unique pour une nouvelle instance de breakdown
// Format : breakdownBar_a3f_1699999999
export const generateBreakdownKey = (baseKey: BreakdownBaseKey): string => {
	const randomId = Math.random().toString(36).substring(2, 5)
	const timestamp = Date.now()
	return `${baseKey}_${randomId}_${timestamp}`
}

// Détecte le type de breakdown depuis une clé d'instance (ex: 'breakdownBar_abc_123' → 'bar')
export const getBreakdownChartType = (key: string): BreakdownChartType | null => {
	if (key.startsWith('breakdownBar')) return 'bar'
	if (key.startsWith('breakdownScatter')) return 'scatter'
	if (key.startsWith('breakdownTable')) return 'table'
	return null
}

// Vérifie si une clé est une instance de breakdown
export const isBreakdownKey = (key: string): boolean => getBreakdownChartType(key) !== null

// Retourne la base key d'une clé d'instance (ex: 'breakdownBar_abc_123' → 'breakdownBar')
export const getBreakdownBaseKey = (key: string): BreakdownBaseKey | null => {
	if (key.startsWith('breakdownBar')) return 'breakdownBar'
	if (key.startsWith('breakdownScatter')) return 'breakdownScatter'
	if (key.startsWith('breakdownTable')) return 'breakdownTable'
	return null
}

// Filtre optionnel appliqué au breakdown (ex: limiter à certains tags, top N tickers...)
export interface BreakdownFilter {
	// Limiter à une liste de clés explicites (ex: ['AAPL', 'MSFT'] ou tag IDs convertis en noms)
	includeKeys?: string[]
	// Limiter aux N premiers groupes selon la métrique affichée (ex: top 10 par P&L)
	topN?: number
	// Pour les tags : filtrer par groupe de tags (tagGroupId)
	tagGroupId?: number
}

// Configuration complète d'un widget breakdown (persistée par item ID)
export interface BreakdownConfig {
	dimension: BreakdownDimension
	// Métrique affichée par le chart (bar/scatter). Ignoré pour la table.
	metric: BreakdownMetric
	chartType: BreakdownChartType
	filter?: BreakdownFilter
	// Colonnes affichées par la table (utilisé seulement quand chartType === 'table').
	// Si non défini, utilise les colonnes par défaut.
	columns?: BreakdownMetric[]
}

export interface DashboardGridItem {
    x: number
    y: number
    w: number
    h: number
    i: string
}

export type WorkspaceId = string

export interface WorkspaceConfig {
    id: WorkspaceId
    name: string
    // Record<string, boolean> au lieu de Record<ChartKey, boolean> pour supporter
    // les clés dynamiques des instances de breakdown (breakdownBar_abc_123...)
    dashboardChartVisibilityLg: Record<string, boolean>
    dashboardChartVisibilityMd: Record<string, boolean>
    dashboardChartVisibilitySm: Record<string, boolean>
    dashboardSectionVisibilityLg: Record<SectionKey, boolean>
    dashboardSectionVisibilityMd: Record<SectionKey, boolean>
    dashboardSectionVisibilitySm: Record<SectionKey, boolean>
    dashboardGridLayout: DashboardGridItem[]
    dashboardGridLayoutMd: DashboardGridItem[]
    dashboardGridLayoutSm: DashboardGridItem[]
    // Configs des widgets breakdown configurables (clé = item ID dans le grid)
    breakdownConfigs?: Record<string, BreakdownConfig>
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
    dashboardChartVisibilityLg?: Record<ChartKey, boolean>
    dashboardChartVisibilityMd?: Record<ChartKey, boolean>
    dashboardChartVisibilitySm?: Record<ChartKey, boolean>
    dashboardSectionVisibilityLg?: Record<SectionKey, boolean>
    dashboardSectionVisibilityMd?: Record<SectionKey, boolean>
    dashboardSectionVisibilitySm?: Record<SectionKey, boolean>
    dashboardGridLayout: DashboardGridItem[]
    dashboardGridLayoutMd?: DashboardGridItem[]
    dashboardGridLayoutSm?: DashboardGridItem[]
    workspaces?: WorkspaceConfig[]
    activeWorkspaceId?: WorkspaceId
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
    sortinoRatio: number
    calmarRatio: number
    sqn: number
    ulcerIndex: number
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

    // Daily metrics
    totalTradingDays: number
    winningDays: number
    losingDays: number
    breakevenDays: number
    maxConsecutiveWinningDays: number
    maxConsecutiveLosingDays: number
    averageDailyPnl: number
    averageWinningDayPnl: number
    averageLosingDayPnl: number
    largestProfitableDayPnl: number
    largestProfitableDayDate: Date | null
    largestLosingDayPnl: number
    largestLosingDayDate: Date | null
    dailyMaxDrawdown: number
    dailyMaxDrawdownPercent: number
    averageDrawdown: number
    averageDrawdownPercent: number

    // R-multiple metrics (nullable — non calculable si aucun trade n'a de SL ni d'historique)
    totalR: number | null
    apptR: number | null
    profitFactorR: number | null
    plRatioR: number | null
    avgWinR: number | null
    avgLossR: number | null
    largestWinR: number | null
    largestLossR: number | null
    totalProfitR: number | null
    totalLossR: number | null
    tradesWithRMultiple: number
    tradesWithStopLoss: number
    // Indicateur de fiabilité : % de trades avec SL réel et label qualitatif
    rMultipleCoverage: number
    rMultipleReliability: 'reliable' | 'partial' | 'approximate' | 'none'
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

