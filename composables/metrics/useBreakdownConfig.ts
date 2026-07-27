import type { BreakdownBaseKey, BreakdownConfig, BreakdownDimension, BreakdownMetric, ChartTemplate, TimeSeriesConfig, WorkspaceConfig, DashboardGridItem } from '~/type'
import { generateBreakdownKey, getBreakdownChartType, getBreakdownBaseKey } from '~/type'

// Config par défaut selon le type de breakdown
const defaultConfigByType: Record<BreakdownBaseKey, BreakdownConfig | TimeSeriesConfig> = {
	breakdownBar: { dimension: 'ticker', metric: 'pnl', chartType: 'bar', logScale: false } as BreakdownConfig,
	breakdownBarVertical: { dimension: 'dayOfWeekOpen', metric: 'pnl', chartType: 'barVertical', logScale: false } as BreakdownConfig,
	breakdownScatter: { dimension: 'ticker', metric: 'winrate', chartType: 'scatter' } as BreakdownConfig,
	breakdownScatter2D: { dimension: 'ticker', metric: 'winrate', metric2: 'profitFactor', colorMetric: 'tradesCount', chartType: 'scatter2D', showScrollX: false, showScrollY: false, logScale: false } as BreakdownConfig,
	breakdownScatterTrades: { dimension: 'ticker', metric: 'pnl', chartType: 'scatterTrades', tradePropertyX: 'duration', tradePropertyY: 'pnl', tickerFilter: null, logScale: false, showScrollX: false, showScrollY: false } as BreakdownConfig,
	breakdownTable: { dimension: 'ticker', metric: 'pnl', chartType: 'table' } as BreakdownConfig,
	breakdownHeatmap: { dimension: 'hourStart', dimension2: 'dayOfWeekOpen', metric: 'pnl', chartType: 'heatmap' } as BreakdownConfig,
	breakdownBoxplot: { dimension: 'ticker', metric: 'pnl', chartType: 'boxplot' } as BreakdownConfig,
	breakdownCalendar: { dimension: 'ticker', metric: 'pnl', chartType: 'calendar' } as BreakdownConfig,
	breakdownRadar: { dimension: 'ticker', metric: 'winrate', chartType: 'radar' } as BreakdownConfig,
	timeSeries: { seriesType: 'bar', metric: 'pnl', chartType: 'timeSeries', maxTrades: 50, yAxisFormat: 'currency' } as TimeSeriesConfig,
}

// Tailles par défaut des items dans le grid selon le type
const defaultGridSize: Record<BreakdownBaseKey, { w: number, h: number }> = {
	breakdownBar: { w: 6, h: 8 },
	breakdownBarVertical: { w: 6, h: 6 },
	breakdownScatter: { w: 6, h: 6 },
	breakdownScatter2D: { w: 12, h: 10 },
	breakdownScatterTrades: { w: 8, h: 8 },
	breakdownTable: { w: 12, h: 12 },
	breakdownHeatmap: { w: 6, h: 6 },
	breakdownBoxplot: { w: 6, h: 6 },
	breakdownCalendar: { w: 12, h: 6 },
	breakdownRadar: { w: 6, h: 6 },
	timeSeries: { w: 6, h: 6 },
}

// Colonnes affichées par défaut dans la table breakdown
export const defaultTableColumns: BreakdownMetric[] = [
	'pnl',
	'tradesCount',
	'winrate',
	'profitFactor',
	'avgWin',
	'avgLoss',
	'expectancy',
	'drawdown',
	'currentDrawdown',
	'avgDuration',
]

// Liste des dimensions disponibles avec leur label i18n
export const dimensionOptions: { value: BreakdownDimension; labelKey: string }[] = [
	{ value: 'ticker', labelKey: 'components.dashboard.breakdown.dimensions.ticker' },
	{ value: 'side', labelKey: 'components.dashboard.breakdown.dimensions.side' },
	{ value: 'monthOpen', labelKey: 'components.dashboard.breakdown.dimensions.monthOpen' },
	{ value: 'monthClose', labelKey: 'components.dashboard.breakdown.dimensions.monthClose' },
	{ value: 'monthYearOpen', labelKey: 'components.dashboard.breakdown.dimensions.monthYearOpen' },
	{ value: 'monthYearClose', labelKey: 'components.dashboard.breakdown.dimensions.monthYearClose' },
	{ value: 'dayOfWeekOpen', labelKey: 'components.dashboard.breakdown.dimensions.dayOfWeekOpen' },
	{ value: 'dayOfWeekClose', labelKey: 'components.dashboard.breakdown.dimensions.dayOfWeekClose' },
	{ value: 'hourStart', labelKey: 'components.dashboard.breakdown.dimensions.hourStart' },
	{ value: 'hourEnd', labelKey: 'components.dashboard.breakdown.dimensions.hourEnd' },
]

// Liste des métriques disponibles avec leur label i18n
export const metricOptions: { value: BreakdownMetric; labelKey: string }[] = [
	{ value: 'pnl', labelKey: 'components.dashboard.breakdown.metrics.pnl' },
	{ value: 'appt', labelKey: 'components.dashboard.breakdown.metrics.appt' },
	{ value: 'winrate', labelKey: 'components.dashboard.breakdown.metrics.winrate' },
	{ value: 'profitFactor', labelKey: 'components.dashboard.breakdown.metrics.profitFactor' },
	{ value: 'avgWin', labelKey: 'components.dashboard.breakdown.metrics.avgWin' },
	{ value: 'avgLoss', labelKey: 'components.dashboard.breakdown.metrics.avgLoss' },
	{ value: 'expectancy', labelKey: 'components.dashboard.breakdown.metrics.expectancy' },
	{ value: 'avgDuration', labelKey: 'components.dashboard.breakdown.metrics.avgDuration' },
	{ value: 'drawdown', labelKey: 'components.dashboard.breakdown.metrics.drawdown' },
	{ value: 'currentDrawdown', labelKey: 'components.dashboard.breakdown.metrics.currentDrawdown' },
	{ value: 'tradesCount', labelKey: 'components.dashboard.breakdown.metrics.tradesCount' },
]

// Types de breakdown disponibles dans le menu visibilité (avec bouton "créer")
export const breakdownTypes: { baseKey: BreakdownBaseKey; labelKey: string }[] = [
	{ baseKey: 'breakdownBar', labelKey: 'components.dashboard.charts.breakdown_bar' },
	{ baseKey: 'breakdownBarVertical', labelKey: 'components.dashboard.charts.breakdown_bar_vertical' },
	{ baseKey: 'breakdownScatter', labelKey: 'components.dashboard.charts.breakdown_scatter' },
	{ baseKey: 'breakdownScatter2D', labelKey: 'components.dashboard.charts.breakdown_scatter_2d' },
	{ baseKey: 'breakdownTable', labelKey: 'components.dashboard.charts.breakdown_table' },
	{ baseKey: 'breakdownCalendar', labelKey: 'components.dashboard.charts.breakdown_calendar' },
	// breakdownBoxplot désactivé temporairement
	// { baseKey: 'breakdownBoxplot', labelKey: 'components.dashboard.charts.breakdown_boxplot' },
	// breakdownRadar désactivé temporairement
	// { baseKey: 'breakdownRadar', labelKey: 'components.dashboard.charts.breakdown_radar' },
]

// Templates prêts à l'emploi (raccourcis pour créer un chart pré-configuré)
export const chartTemplates: ChartTemplate[] = [
	// --- Répartition : Barres ---
	{ id: 'pnlByDayOfWeek', labelKey: 'components.dashboard.templates.pnl_by_day_of_week', category: 'breakdown', subcategory: 'bars', baseKey: 'breakdownBarVertical', config: { dimension: 'dayOfWeekOpen', metric: 'pnl', chartType: 'barVertical' } },
	{ id: 'winrateByHour', labelKey: 'components.dashboard.templates.winrate_by_hour', category: 'breakdown', subcategory: 'bars', baseKey: 'breakdownBarVertical', config: { dimension: 'hourStart', metric: 'winrate', chartType: 'barVertical' } },
	{ id: 'pnlByMonth', labelKey: 'components.dashboard.templates.pnl_by_month', category: 'breakdown', subcategory: 'bars', baseKey: 'breakdownBar', config: { dimension: 'monthOpen', metric: 'pnl', chartType: 'bar' } },
	{ id: 'pnlByMonthYear', labelKey: 'components.dashboard.templates.pnl_by_month_year', category: 'breakdown', subcategory: 'bars', baseKey: 'breakdownBar', config: { dimension: 'monthYearOpen', metric: 'pnl', chartType: 'bar' } },
	// --- Répartition : Heatmap ---
	{ id: 'heatmapHourDay', labelKey: 'components.dashboard.templates.heatmap_hour_day', category: 'breakdown', subcategory: 'scatterHeatmap', baseKey: 'breakdownHeatmap', config: { dimension: 'hourStart', dimension2: 'dayOfWeekOpen', metric: 'pnl', chartType: 'heatmap' } },
	// --- Distribution & profils ---
	{ id: 'pnlCalendar', labelKey: 'components.dashboard.templates.pnl_calendar', category: 'breakdown', subcategory: 'distribution', baseKey: 'breakdownCalendar', config: { dimension: 'ticker', metric: 'pnl', chartType: 'calendar' } },
	// Scatter 2D : corrélations entre métriques agrégées
	{ id: 'winrateVsProfitFactor', labelKey: 'components.dashboard.templates.winrate_vs_profit_factor', category: 'breakdown', subcategory: 'distribution', baseKey: 'breakdownScatter2D', config: { dimension: 'ticker', metric: 'winrate', metric2: 'profitFactor', colorMetric: 'tradesCount', chartType: 'scatter2D' } },
	{ id: 'avgWinVsAvgLoss', labelKey: 'components.dashboard.templates.avg_win_vs_avg_loss', category: 'breakdown', subcategory: 'distribution', baseKey: 'breakdownScatter2D', config: { dimension: 'ticker', metric: 'avgWin', metric2: 'avgLoss', colorMetric: 'expectancy', chartType: 'scatter2D' } },
	{ id: 'pnlVsDrawdown', labelKey: 'components.dashboard.templates.pnl_vs_drawdown', category: 'breakdown', subcategory: 'distribution', baseKey: 'breakdownScatter2D', config: { dimension: 'ticker', metric: 'pnl', metric2: 'drawdown', colorMetric: 'tradesCount', chartType: 'scatter2D' } },
	// scatterTrades : 1 point par trade individuel (durée vs P&L)
	{ id: 'durationVsPnl', labelKey: 'components.dashboard.templates.duration_vs_pnl', category: 'breakdown', subcategory: 'distribution', baseKey: 'breakdownScatterTrades', config: { dimension: 'ticker', metric: 'pnl', chartType: 'scatterTrades', tradePropertyX: 'duration', tradePropertyY: 'pnl', tickerFilter: null, logScale: false } },
	// pnlDistributionByTicker (boxplot) désactivé temporairement
	// { id: 'pnlDistributionByTicker', labelKey: 'components.dashboard.templates.pnl_distribution_by_ticker', category: 'breakdown', subcategory: 'distribution', baseKey: 'breakdownBoxplot', config: { dimension: 'ticker', metric: 'pnl', chartType: 'boxplot' } },
	// performanceRadar désactivé temporairement
	// { id: 'performanceRadar', labelKey: 'components.dashboard.templates.performance_radar', category: 'breakdown', subcategory: 'distribution', baseKey: 'breakdownRadar', config: { dimension: 'ticker', metric: 'winrate', chartType: 'radar' } },
	// --- Séries temporelles (presets) ---
	{ id: 'pnlByTrade', labelKey: 'components.dashboard.templates.pnl_by_trade', category: 'breakdown', subcategory: 'timeSeries', baseKey: 'timeSeries', config: { seriesType: 'bar', metric: 'pnl', chartType: 'timeSeries', maxTrades: 50, yAxisFormat: 'currency', crosshairType: 'cross' } },
	{ id: 'appt', labelKey: 'components.dashboard.templates.appt', category: 'breakdown', subcategory: 'timeSeries', baseKey: 'timeSeries', config: { seriesType: 'barMA', metric: 'appt', chartType: 'timeSeries', aggregation: 'week', showBars: true, showMovingAverage: true, movingAverageWindow: 5, yAxisFormat: 'currency', crosshairType: 'cross' } },
	{ id: 'winrate', labelKey: 'components.dashboard.templates.winrate', category: 'breakdown', subcategory: 'timeSeries', baseKey: 'timeSeries', config: { seriesType: 'barMA', metric: 'winrate', chartType: 'timeSeries', aggregation: 'week', showBars: true, showMovingAverage: true, movingAverageWindow: 3, yAxisMin: 0, yAxisMax: 100, yAxisFormat: 'percent', crosshairType: 'cross' } },
	// --- Avancé (from scratch) ---
	{ id: 'customBar', labelKey: 'components.dashboard.templates.custom_bar', category: 'advanced', subcategory: 'breakdown', baseKey: 'breakdownBar', config: { dimension: 'ticker', metric: 'pnl', chartType: 'bar' } },
	{ id: 'customBarVertical', labelKey: 'components.dashboard.templates.custom_bar_vertical', category: 'advanced', subcategory: 'breakdown', baseKey: 'breakdownBarVertical', config: { dimension: 'dayOfWeekOpen', metric: 'pnl', chartType: 'barVertical' } },
	{ id: 'customScatter', labelKey: 'components.dashboard.templates.custom_scatter', category: 'advanced', subcategory: 'breakdown', baseKey: 'breakdownScatter', config: { dimension: 'ticker', metric: 'winrate', chartType: 'scatter' } },
	{ id: 'customTable', labelKey: 'components.dashboard.templates.custom_table', category: 'advanced', subcategory: 'breakdown', baseKey: 'breakdownTable', config: { dimension: 'ticker', metric: 'pnl', chartType: 'table' } },
	{ id: 'customBarMA', labelKey: 'components.dashboard.templates.custom_bar_ma', category: 'advanced', subcategory: 'timeSeries', baseKey: 'timeSeries', config: { seriesType: 'barMA', metric: 'pnl', chartType: 'timeSeries', aggregation: 'week', showBars: true, showMovingAverage: true, movingAverageWindow: 5, yAxisFormat: 'currency', crosshairType: 'cross' } },
	{ id: 'customAreaChart', labelKey: 'components.dashboard.templates.custom_area_chart', category: 'advanced', subcategory: 'timeSeries', baseKey: 'timeSeries', config: { seriesType: 'area', metric: 'pnl', chartType: 'timeSeries', aggregation: 'week', showThreshold: true, yAxisFormat: 'currency', crosshairType: 'line' } },
]

// Migration des anciennes dimensions vers les nouvelles (open/close)
const dimensionMigration: Record<string, string> = {
	dayOfWeek: 'dayOfWeekOpen',
	month: 'monthOpen',
	monthYear: 'monthYearOpen',
}

// Migre une dimension ancienne vers la nouvelle nomenclature
export const migrateDimension = (dim: string): string => dimensionMigration[dim] ?? dim

// Récupère un template par son id
export const getTemplateById = (id: string): ChartTemplate | undefined =>
	chartTemplates.find(t => t.id === id)

// Templates groupés par catégorie (pour le menu visibilité)
export const templatesByCategory = {
	breakdown: chartTemplates.filter(t => t.category === 'breakdown'),
	advanced: chartTemplates.filter(t => t.category === 'advanced'),
}

// Templates avancés groupés par sous-catégorie (breakdown vs timeSeries)
export const advancedTemplatesBySubcategory = {
	breakdown: chartTemplates.filter(t => t.category === 'advanced' && t.subcategory === 'breakdown'),
	timeSeries: chartTemplates.filter(t => t.category === 'advanced' && t.subcategory === 'timeSeries'),
}

// Templates de répartition groupés par sous-catégorie
export const breakdownTemplatesBySubcategory = {
	bars: chartTemplates.filter(t => t.category === 'breakdown' && t.subcategory === 'bars'),
	scatterHeatmap: chartTemplates.filter(t => t.category === 'breakdown' && t.subcategory === 'scatterHeatmap'),
	distribution: chartTemplates.filter(t => t.category === 'breakdown' && t.subcategory === 'distribution'),
	timeSeries: chartTemplates.filter(t => t.category === 'breakdown' && t.subcategory === 'timeSeries'),
}

// Composable pour gérer la config d'une instance de widget breakdown
// itemId = clé unique (ex: 'breakdownBar_a3f_1699999999')
export const useBreakdownConfig = (itemId: string) => {
	const { activeWorkspace, updateActiveWorkspace } = useDashboardWorkspace()

	// Détecte le chartType depuis le préfixe de la clé
	const chartType = computed(() => getBreakdownChartType(itemId) || 'bar')

	// Récupère la config persistée pour cet item, ou une config par défaut selon le type
	const config = computed<BreakdownConfig | TimeSeriesConfig>(() => {
		const configs = activeWorkspace.value?.breakdownConfigs
		const saved = configs?.[itemId]
		if (saved) return saved
		// Config par défaut selon le préfixe
		const baseKey = getBreakdownBaseKey(itemId) || 'breakdownBar'
		return defaultConfigByType[baseKey] || { dimension: 'ticker', metric: 'pnl', chartType: 'bar' }
	})

	// Met à jour la config et persiste
	const updateConfig = (patch: Partial<BreakdownConfig>) => {
		const currentConfigs = activeWorkspace.value?.breakdownConfigs || {}
		const newConfig = { ...config.value, ...patch }
		const newConfigs = { ...currentConfigs, [itemId]: newConfig }
		updateActiveWorkspace({ breakdownConfigs: newConfigs } as Partial<WorkspaceConfig>)
	}

	const setDimension = (dimension: BreakdownDimension) => updateConfig({ dimension })
	const setMetric = (metric: BreakdownMetric) => updateConfig({ metric })

	return {
		config,
		chartType,
		setDimension,
		setMetric,
		updateConfig,
	}
}

// Composable pour gérer les instances de breakdown (création, suppression, listing)
export const useBreakdownInstances = () => {
	const { activeWorkspace, updateActiveWorkspace } = useDashboardWorkspace()

	// Liste toutes les clés d'instances de breakdown existantes (depuis breakdownConfigs + visibilité + layout)
	const instanceKeys = computed<string[]>(() => {
		const keys = new Set<string>()
		const configs = activeWorkspace.value?.breakdownConfigs || {}
		Object.keys(configs).forEach(k => keys.add(k))
		// Aussi depuis les visibilités (au cas où la config n'existerait pas encore)
		const vis = activeWorkspace.value?.dashboardChartVisibilityLg || {}
		Object.keys(vis).forEach(k => {
			if (getBreakdownChartType(k)) keys.add(k)
		})
		return Array.from(keys)
	})

	// Liste les instances par type de base
	const instancesByType = computed<Record<BreakdownBaseKey, string[]>>(() => {
		const result: Record<BreakdownBaseKey, string[]> = {
			breakdownBar: [],
			breakdownBarVertical: [],
			breakdownScatter: [],
			breakdownScatter2D: [],
			breakdownScatterTrades: [],
			breakdownTable: [],
			breakdownHeatmap: [],
			breakdownBoxplot: [],
			breakdownCalendar: [],
			breakdownRadar: [],
			timeSeries: [],
		}
		for (const key of instanceKeys.value) {
			const baseKey = getBreakdownBaseKey(key)
			if (baseKey) result[baseKey].push(key)
		}
		return result
	})

	// Crée une nouvelle instance de breakdown
	const createInstance = (baseKey: BreakdownBaseKey): string => {
		const newKey = generateBreakdownKey(baseKey)
		const config = defaultConfigByType[baseKey]
		const size = defaultGridSize[baseKey]

		// 1. Ajoute la config
		const currentConfigs = activeWorkspace.value?.breakdownConfigs || {}
		const newConfigs = { ...currentConfigs, [newKey]: config }

		// 2. Ajoute à la visibilité (visible par défaut sur les 3 breakpoints)
		const visLg = { ...(activeWorkspace.value?.dashboardChartVisibilityLg || {}), [newKey]: true }
		const visMd = { ...(activeWorkspace.value?.dashboardChartVisibilityMd || {}), [newKey]: true }
		const visSm = { ...(activeWorkspace.value?.dashboardChartVisibilitySm || {}), [newKey]: true }

		// 3. Ajoute au grid layout (à la fin, position auto)
		const newItem: DashboardGridItem = { w: size.w, h: size.h, x: 0, y: 0, i: newKey }
		const layoutLg = [...(activeWorkspace.value?.dashboardGridLayout || []), newItem]
		const layoutMd = [...(activeWorkspace.value?.dashboardGridLayoutMd || []), { ...newItem }]
		const layoutSm = [...(activeWorkspace.value?.dashboardGridLayoutSm || []), { ...newItem, w: 3 }]

		updateActiveWorkspace({
			breakdownConfigs: newConfigs,
			dashboardChartVisibilityLg: visLg,
			dashboardChartVisibilityMd: visMd,
			dashboardChartVisibilitySm: visSm,
			dashboardGridLayout: layoutLg,
			dashboardGridLayoutMd: layoutMd,
			dashboardGridLayoutSm: layoutSm,
		} as Partial<WorkspaceConfig>)

		return newKey
	}

	// Crée une nouvelle instance depuis un template pré-configuré
	const createFromTemplate = (templateId: string): string | null => {
		const template = getTemplateById(templateId)
		if (!template) return null
		const newKey = generateBreakdownKey(template.baseKey)
		// Merge : config par défaut du type + override du template
		const baseConfig = defaultConfigByType[template.baseKey]
		const config: BreakdownConfig = { ...baseConfig, ...template.config } as BreakdownConfig
		const size = defaultGridSize[template.baseKey]

		const currentConfigs = activeWorkspace.value?.breakdownConfigs || {}
		const newConfigs = { ...currentConfigs, [newKey]: config }

		const visLg = { ...(activeWorkspace.value?.dashboardChartVisibilityLg || {}), [newKey]: true }
		const visMd = { ...(activeWorkspace.value?.dashboardChartVisibilityMd || {}), [newKey]: true }
		const visSm = { ...(activeWorkspace.value?.dashboardChartVisibilitySm || {}), [newKey]: true }

		const newItem: DashboardGridItem = { w: size.w, h: size.h, x: 0, y: 0, i: newKey }
		const layoutLg = [...(activeWorkspace.value?.dashboardGridLayout || []), newItem]
		const layoutMd = [...(activeWorkspace.value?.dashboardGridLayoutMd || []), { ...newItem }]
		const layoutSm = [...(activeWorkspace.value?.dashboardGridLayoutSm || []), { ...newItem, w: 3 }]

		updateActiveWorkspace({
			breakdownConfigs: newConfigs,
			dashboardChartVisibilityLg: visLg,
			dashboardChartVisibilityMd: visMd,
			dashboardChartVisibilitySm: visSm,
			dashboardGridLayout: layoutLg,
			dashboardGridLayoutMd: layoutMd,
			dashboardGridLayoutSm: layoutSm,
		} as Partial<WorkspaceConfig>)

		return newKey
	}

	// Supprime une instance de breakdown
	const deleteInstance = (key: string) => {
		// 1. Retire la config
		const currentConfigs = { ...(activeWorkspace.value?.breakdownConfigs || {}) }
		delete currentConfigs[key]

		// 2. Retire des visibilités
		const removeKey = (obj: Record<string, boolean>) => {
			const copy = { ...obj }
			delete copy[key]
			return copy
		}
		const visLg = removeKey(activeWorkspace.value?.dashboardChartVisibilityLg || {})
		const visMd = removeKey(activeWorkspace.value?.dashboardChartVisibilityMd || {})
		const visSm = removeKey(activeWorkspace.value?.dashboardChartVisibilitySm || {})

		// 3. Retire du grid layout
		const filterLayout = (layout: DashboardGridItem[]) => layout.filter(item => item.i !== key)
		const layoutLg = filterLayout(activeWorkspace.value?.dashboardGridLayout || [])
		const layoutMd = filterLayout(activeWorkspace.value?.dashboardGridLayoutMd || [])
		const layoutSm = filterLayout(activeWorkspace.value?.dashboardGridLayoutSm || [])

		updateActiveWorkspace({
			breakdownConfigs: currentConfigs,
			dashboardChartVisibilityLg: visLg,
			dashboardChartVisibilityMd: visMd,
			dashboardChartVisibilitySm: visSm,
			dashboardGridLayout: layoutLg,
			dashboardGridLayoutMd: layoutMd,
			dashboardGridLayoutSm: layoutSm,
		} as Partial<WorkspaceConfig>)
	}

	return {
		instanceKeys,
		instancesByType,
		createInstance,
		createFromTemplate,
		deleteInstance,
	}
}
