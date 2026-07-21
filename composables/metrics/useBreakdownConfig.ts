import type { BreakdownBaseKey, BreakdownConfig, BreakdownDimension, BreakdownMetric, WorkspaceConfig, DashboardGridItem } from '~/type'
import { generateBreakdownKey, getBreakdownChartType, getBreakdownBaseKey } from '~/type'

// Config par défaut selon le type de breakdown
const defaultConfigByType: Record<BreakdownBaseKey, BreakdownConfig> = {
	breakdownBar: { dimension: 'ticker', metric: 'pnl', chartType: 'bar' },
	breakdownScatter: { dimension: 'ticker', metric: 'winrate', chartType: 'scatter' },
	breakdownTable: { dimension: 'ticker', metric: 'pnl', chartType: 'table' },
}

// Tailles par défaut des items dans le grid selon le type
const defaultGridSize: Record<BreakdownBaseKey, { w: number, h: number }> = {
	breakdownBar: { w: 6, h: 8 },
	breakdownScatter: { w: 6, h: 6 },
	breakdownTable: { w: 12, h: 12 },
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
	{ value: 'tag', labelKey: 'components.dashboard.breakdown.dimensions.tag' },
	{ value: 'side', labelKey: 'components.dashboard.breakdown.dimensions.side' },
	{ value: 'month', labelKey: 'components.dashboard.breakdown.dimensions.month' },
	{ value: 'dayOfWeek', labelKey: 'components.dashboard.breakdown.dimensions.dayOfWeek' },
	{ value: 'hour', labelKey: 'components.dashboard.breakdown.dimensions.hour' },
	{ value: 'account', labelKey: 'components.dashboard.breakdown.dimensions.account' },
]

// Liste des métriques disponibles avec leur label i18n
export const metricOptions: { value: BreakdownMetric; labelKey: string }[] = [
	{ value: 'pnl', labelKey: 'components.dashboard.breakdown.metrics.pnl' },
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
	{ baseKey: 'breakdownScatter', labelKey: 'components.dashboard.charts.breakdown_scatter' },
	{ baseKey: 'breakdownTable', labelKey: 'components.dashboard.charts.breakdown_table' },
]

// Composable pour gérer la config d'une instance de widget breakdown
// itemId = clé unique (ex: 'breakdownBar_a3f_1699999999')
export const useBreakdownConfig = (itemId: string) => {
	const { activeWorkspace, updateActiveWorkspace } = useDashboardWorkspace()

	// Détecte le chartType depuis le préfixe de la clé
	const chartType = computed(() => getBreakdownChartType(itemId) || 'bar')

	// Récupère la config persistée pour cet item, ou une config par défaut selon le type
	const config = computed<BreakdownConfig>(() => {
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
			breakdownScatter: [],
			breakdownTable: [],
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
		deleteInstance,
	}
}
