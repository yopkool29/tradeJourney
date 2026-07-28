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

export type ChartKey = 'pnlBar' | 'cumulatedPnl' | 'appt' | 'winrate' | 'hourlyHeatmap' | string
export type SectionKey = 'allTrades' | 'profitTrades' | 'losingTrades' | 'winLossComparison' | 'riskRatios' | 'dayStatistics'

// Liste des clés de sections (source de vérité unique)
export const sectionKeys: SectionKey[] = ['allTrades', 'profitTrades', 'losingTrades', 'winLossComparison', 'riskRatios', 'dayStatistics']

// Préfixes des types de breakdown (base key sans l'ID d'instance)
export type BreakdownBaseKey = 'breakdownBar' | 'breakdownBarVertical' | 'breakdownScatter' | 'breakdownScatter2D' | 'breakdownScatterTrades' | 'breakdownTable' | 'breakdownHeatmap' | 'breakdownBoxplot' | 'breakdownCalendar' | 'breakdownRadar' | 'timeSeries'

// Dimensions disponibles pour les breakdowns configurables
// 'tagGroup_<name>' est généré dynamiquement pour chaque groupe de tags
// 'hourDayOfWeek' est une dimension 2D spéciale pour les heatmaps
export type BreakdownDimension = 'ticker' | 'tag' | 'side' | 'monthOpen' | 'monthClose' | 'monthYearOpen' | 'monthYearClose' | 'dayOfWeekOpen' | 'dayOfWeekClose' | 'hourStart' | 'hourEnd' | 'hourDayOfWeek' | (string & {})

// Préfixe pour les dimensions de tag groups (ex: 'tagGroup_Strategy')
export const tagGroupDimensionPrefix = 'tagGroup_'

// Vérifie si une dimension est un tag group
export const isTagGroupDimension = (dim: string): boolean => dim.startsWith(tagGroupDimensionPrefix)

// Extrait le nom du groupe depuis une dimension tagGroup
export const getTagGroupName = (dim: string): string | null => {
	if (!isTagGroupDimension(dim)) return null
	return dim.slice(tagGroupDimensionPrefix.length)
}

// Métriques mesurables sur un breakdown
export type BreakdownMetric = 'pnl' | 'winrate' | 'profitFactor' | 'avgWin' | 'avgLoss' | 'expectancy' | 'avgDuration' | 'drawdown' | 'currentDrawdown' | 'tradesCount' | 'appt'

// Types de charts disponibles pour les breakdowns
export type BreakdownChartType = 'bar' | 'barVertical' | 'scatter' | 'scatter2D' | 'scatterTrades' | 'table' | 'heatmap' | 'boxplot' | 'calendar' | 'radar' | 'timeSeries'

// Propriétés d'un trade individuel utilisables comme axes du scatterTrades
// mfe/mae : Maximum Favorable/Adverse Excursion (champs déjà présents dans TradeExtendedType, nullable)
export type TradeProperty = 'duration' | 'pnl' | 'mfe' | 'mae'

// Format de l'axe Y pour les séries temporelles
export type TimeSeriesYAxisFormat = 'currency' | 'percent' | 'number'

// Agrégation temporelle
export type TimeSeriesAggregation = 'day' | 'week' | 'month'

// Génère une clé unique pour une nouvelle instance de breakdown
// Format : breakdownBar_a3f_1699999999
export const generateBreakdownKey = (baseKey: BreakdownBaseKey): string => {
	const randomId = Math.random().toString(36).substring(2, 5)
	const timestamp = Date.now()
	return `${baseKey}_${randomId}_${timestamp}`
}

// Détecte le type de breakdown depuis une clé d'instance (ex: 'breakdownBar_abc_123' → 'bar')
export const getBreakdownChartType = (key: string): BreakdownChartType | null => {
	if (key.startsWith('timeSeries')) return 'timeSeries'
	if (key.startsWith('breakdownHeatmap')) return 'heatmap'
	if (key.startsWith('breakdownBoxplot')) return 'boxplot'
	if (key.startsWith('breakdownCalendar')) return 'calendar'
	if (key.startsWith('breakdownRadar')) return 'radar'
	if (key.startsWith('breakdownBarVertical')) return 'barVertical'
	if (key.startsWith('breakdownBar')) return 'bar'
	if (key.startsWith('breakdownScatter2D')) return 'scatter2D'
	if (key.startsWith('breakdownScatterTrades')) return 'scatterTrades'
	if (key.startsWith('breakdownScatter')) return 'scatter'
	if (key.startsWith('breakdownTable')) return 'table'
	return null
}

// Vérifie si une clé est une instance de breakdown
export const isBreakdownKey = (key: string): boolean => getBreakdownChartType(key) !== null

// Retourne la base key d'une clé d'instance (ex: 'breakdownBar_abc_123' → 'breakdownBar')
export const getBreakdownBaseKey = (key: string): BreakdownBaseKey | null => {
	if (key.startsWith('timeSeries')) return 'timeSeries'
	if (key.startsWith('breakdownHeatmap')) return 'breakdownHeatmap'
	if (key.startsWith('breakdownBoxplot')) return 'breakdownBoxplot'
	if (key.startsWith('breakdownCalendar')) return 'breakdownCalendar'
	if (key.startsWith('breakdownRadar')) return 'breakdownRadar'
	if (key.startsWith('breakdownBarVertical')) return 'breakdownBarVertical'
	if (key.startsWith('breakdownBar')) return 'breakdownBar'
	if (key.startsWith('breakdownScatter2D')) return 'breakdownScatter2D'
	if (key.startsWith('breakdownScatterTrades')) return 'breakdownScatterTrades'
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

// Catégories de templates pour le menu visibilité
export type ChartTemplateCategory = 'breakdown' | 'advanced'

// Template = raccourci pour créer un chart pré-configuré (dimension + métrique + params)
export interface ChartTemplate {
	id: string
	labelKey: string
	category: ChartTemplateCategory
	subcategory?: string
	baseKey: BreakdownBaseKey
	config: Partial<BreakdownConfig> | Partial<TimeSeriesConfig>
}

// Configuration complète d'un widget breakdown (persistée par item ID)
export interface BreakdownConfig {
	dimension: BreakdownDimension
	// Deuxième dimension pour la heatmap (axe Y). Ignoré pour les autres chart types.
	dimension2?: BreakdownDimension
	// Métrique affichée par le chart (bar/scatter). Ignoré pour la table.
	// Pour scatter2D : métrique sur l'axe X.
	metric: BreakdownMetric
	// Métrique sur l'axe Y pour scatter2D. Ignoré pour les autres chart types.
	metric2?: BreakdownMetric
	// Métrique utilisée pour la couleur (visualMap) du scatter2D. Ignoré pour les autres chart types.
	// Si non défini, utilise tradesCount par défaut.
	colorMetric?: BreakdownMetric
	// Scatter 2D : largeur du percentile pour les bornes des axes (ex: 1 = 1er/99e, 5 = 5e/95e).
	// 0 = min/max absolus (pas de filtrage d'extremes). Défaut: 1.
	percentileRange?: number
	// Scatter 2D : afficher les scrollbars (dataZoom sliders) sur les axes X et Y. Défaut: true.
	showScrollX?: boolean
	showScrollY?: boolean
	// Scatter 2D : afficher le label de la dimension au-dessus de chaque point. Défaut: true.
	showLabels?: boolean
	// Scatter 2D : échelle logarithmique sur les axes X et Y. Défaut: false (linéaire).
	logScale?: boolean
	// scatterTrades : propriété du trade sur l'axe X (durée, P&L...). Défaut: 'duration'.
	tradePropertyX?: TradeProperty
	// scatterTrades : propriété du trade sur l'axe Y. Défaut: 'pnl'.
	tradePropertyY?: TradeProperty
	// scatterTrades : filtrer par ticker (null = tous les tickers). Défaut: null.
	tickerFilter?: string | null
	chartType: BreakdownChartType
	filter?: BreakdownFilter
	// Colonnes affichées par la table (utilisé seulement quand chartType === 'table').
	// Si non défini, utilise les colonnes par défaut.
	columns?: BreakdownMetric[]
	// Métriques supplémentaires affichées dans le tooltip (bar/scatter).
	// Vide par défaut — l'utilisateur les active via le menu settings.
	tooltipMetrics?: BreakdownMetric[]
}

// Type de chart pour les séries temporelles (fixé par le template, ne change pas avec la métrique)
export type TimeSeriesChartType = 'bar' | 'barMA' | 'area'

// Configuration d'un widget série temporelle (persistée par item ID)
export interface TimeSeriesConfig {
	// Type de chart visuel (fixé par le template) : bar (barres), barMA (barres + moyenne mobile), area (courbe remplie)
	seriesType: TimeSeriesChartType
	// Métrique affichée (même liste que les breakdowns)
	metric: BreakdownMetric
	chartType: 'timeSeries'
	// Agrégation temporelle (day/week/month) — ignorée pour seriesType 'bar' (par trade)
	aggregation?: TimeSeriesAggregation
	// Afficher les barres (barMA)
	showBars?: boolean
	// Afficher la moyenne mobile (barMA)
	showMovingAverage?: boolean
	// Fenêtre de la moyenne mobile
	movingAverageWindow?: number
	// Nombre max de trades affichés (seriesType 'bar' seulement)
	maxTrades?: number
	// Afficher la ligne de seuil (area: startingCapital)
	showThreshold?: boolean
	// Limites de l'axe Y
	yAxisMin?: number
	yAxisMax?: number
	// Format de l'axe Y
	yAxisFormat?: TimeSeriesYAxisFormat
	// Type de réticule : 'cross' (horizontal + vertical) ou 'line' (vertical uniquement)
	crosshairType?: 'cross' | 'line'
	// Métriques supplémentaires affichées dans le tooltip (barMA seulement)
	tooltipMetrics?: BreakdownMetric[]
	// Afficher la scrollbar horizontale (dataZoom) pour zoomer sur l'axe X
	showScrollX?: boolean
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
    breakdownConfigs?: Record<string, BreakdownConfig | TimeSeriesConfig>
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
    tradeFrequency: number
    winningDays: number
    losingDays: number
    breakevenDays: number
    maxConsecutiveWinningDays: number
    maxConsecutiveLosingDays: number
    winningWeeksPercent: number
    winningMonthsPercent: number
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

