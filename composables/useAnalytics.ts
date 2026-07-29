import type { TradeExtendedType } from '~/schema/trade'
import type { BreakdownDimension, BreakdownMetric } from '~/type'
import { isTagGroupDimension, getTagGroupName } from '~/type'
import { getHourAndWeekdayInUserTimezone, formatDurationMinutes } from '~/utils/date-utils'
import { formatCurrency } from '~/utils'
import { chartColors, monetaryColorForValue, winrateColor, profitFactorColor, isMonetaryMetric } from '~/composables/useChartColors'

export interface TickerMetrics {
	symbol: string
	pnl: number
	winrate: number
	tradesCount: number
	avgWin: number
	avgLoss: number
	profitFactor: number
	avgDuration: number
	avgMfe: number | null
	avgMae: number | null
	winningTradesCount: number
	losingTradesCount: number
}

// Métriques génériques pour un breakdown par dimension (ticker, tag, side, month, etc.)
// 'key' remplace 'symbol' — c'est le label du groupe (ex: 'AAPL', 'breakout', 'Long', '2024-01')
export interface BreakdownMetrics {
	key: string
	pnl: number
	winrate: number
	tradesCount: number
	avgWin: number
	avgLoss: number
	profitFactor: number
	avgDuration: number
	avgMfe: number | null
	avgMae: number | null
	winningTradesCount: number
	losingTradesCount: number
	// Métriques additionnelles pour les widgets configurables
	expectancy: number
	// Max drawdown : pire creux depuis un peak (négatif ou 0)
	drawdown: number
	// Drawdown actuel : distance entre le dernier peak et le P&L cumulé actuel (négatif ou 0)
	// Si on est à un nouveau peak, currentDrawdown = 0
	currentDrawdown: number
}

// Settings de timezone passés aux fonctions de grouping temporel
export interface TimezoneSettings {
	timezoneDisplay: 'CURRENT' | 'LOCAL' | 'UTC'
	timezoneLocal: string
	timezoneUtcOffset: number
}

// Fonction de grouping : retourne la/les clé(s) d'un trade
// Un trade peut appartenir à plusieurs groupes (ex: multi-tags) → retourne un tableau
export type GroupFn = (trade: TradeExtendedType) => string[]

// Crée une entrée BreakdownMetrics vide (pour les tags avec 0 trade)
export const createEmptyMetrics = (key: string): BreakdownMetrics => ({
	key,
	pnl: 0,
	winrate: 0,
	tradesCount: 0,
	avgWin: 0,
	avgLoss: 0,
	profitFactor: 0,
	avgDuration: 0,
	avgMfe: null,
	avgMae: null,
	winningTradesCount: 0,
	losingTradesCount: 0,
	expectancy: 0,
	drawdown: 0,
	currentDrawdown: 0,
})

// Récupère la valeur d'une métrique spécifique depuis un BreakdownMetrics
// Retourne NaN pour les tags sans trades (sauf tradesCount qui retourne 0)
export const getMetricValueForMetric = (m: BreakdownMetrics, metric: BreakdownMetric): number => {
	if (metric !== 'tradesCount' && m.tradesCount === 0) return NaN
	switch (metric) {
		case 'pnl': return m.pnl
		case 'winrate': return m.winrate
		case 'profitFactor': return m.profitFactor === Infinity ? Number.MAX_SAFE_INTEGER : m.profitFactor
		case 'avgWin': return m.avgWin
		case 'avgLoss': return -m.avgLoss
		case 'expectancy': return m.expectancy
		case 'avgDuration': return m.avgDuration
		case 'drawdown': return m.drawdown
		case 'currentDrawdown': return m.currentDrawdown
		case 'tradesCount': return m.tradesCount
		case 'appt': return m.tradesCount > 0 ? m.pnl / m.tradesCount : NaN
		default: return m.pnl
	}
}

// Formate la valeur d'une métrique selon son type
export const formatMetricValueForMetric = (val: number, metric: BreakdownMetric): string => {
	// Métriques monétaires : masque les valeurs proches de 0
	if (isMonetaryMetric(metric) && Math.abs(val) < 0.005) return ''
	switch (metric) {
		case 'pnl':
		case 'avgWin':
		case 'avgLoss':
		case 'expectancy':
		case 'drawdown':
		case 'currentDrawdown':
		case 'appt':
			return formatCurrency(val)
		case 'winrate':
			return `${val.toFixed(1)}%`
		case 'profitFactor':
			return val >= 999 ? '∞' : val.toFixed(2)
		case 'avgDuration':
			return formatDurationMinutes(val)
		case 'tradesCount':
			return String(Math.round(val))
		default:
			return formatCurrency(val)
	}
}

// Couleur d'une métrique selon sa valeur (dégradé HSL smooth)
// Utilisé par les charts (bar/scatter) et la table
// - monétaire (pnl, appt, etc.) : rouge/vert binaire
// - ratio (profitFactor) : dégradé rouge→vert avec seuil à 1
// - pourcentage (winrate) : couleur uniforme (barColor)
// - durée/compteur (avgDuration, tradesCount) : couleur uniforme (rawMetricColor)
export const getMetricColor = (
	m: BreakdownMetrics,
	metric: BreakdownMetric,
	colors?: { profit?: string; loss?: string; bar?: string; rawMetric?: string },
): string => {
	if (metric === 'profitFactor') {
		return profitFactorColor(m.profitFactor)
	}
	if (metric === 'winrate') {
		return colors?.bar || '#fbbf24'
	}
	if (metric === 'avgDuration' || metric === 'tradesCount') {
		return colors?.rawMetric || '#3b82f6'
	}
	// Métriques monétaires : rouge/vert binaire
	const val = getMetricValueForMetric(m, metric)
	if (val > 0) return colors?.profit || '#22c55e'
	if (val < 0) return colors?.loss || '#ef4444'
	return colors?.bar || '#fbbf24'
}

// Tri logique des métriques selon la dimension
// - dayOfWeek/month : tri chronologique par index
// - monthYear : tri chronologique par clé 'YYYY-MM'
// - hourStart/hourEnd : tri alphabétique (= chronologique pour '08h')
// - autres (ticker, tag, side) : tri par métrique décroissante
export const sortMetricsByDimension = (
	metrics: BreakdownMetrics[],
	dimension: BreakdownDimension,
	metric: BreakdownMetric,
): BreakdownMetrics[] => {
	if (dimension === 'dayOfWeekOpen' || dimension === 'dayOfWeekClose' || dimension === 'monthOpen' || dimension === 'monthClose') {
		return [...metrics].sort((a, b) => parseInt(a.key, 10) - parseInt(b.key, 10))
	}
	if (dimension === 'monthYearOpen' || dimension === 'monthYearClose') {
		return [...metrics].sort((a, b) => a.key.localeCompare(b.key))
	}
	if (dimension === 'hourStart' || dimension === 'hourEnd') {
		return [...metrics].sort((a, b) => a.key.localeCompare(b.key))
	}
	// avgLoss : la valeur retournée est -avgLoss (négative), donc le tri décroissant
	// met la plus petite perte en premier. On inverse pour que la plus grande perte
	// arrive en premier (utile avec le filtre Top N).
	// NaN (pas de donnée) toujours à la fin.
	const nanLast = (a: BreakdownMetrics, b: BreakdownMetrics, metric: BreakdownMetric, asc: boolean): number => {
		const va = getMetricValueForMetric(a, metric)
		const vb = getMetricValueForMetric(b, metric)
		const aNaN = isNaN(va)
		const bNaN = isNaN(vb)
		if (aNaN && bNaN) return 0
		if (aNaN) return 1
		if (bNaN) return -1
		return asc ? va - vb : vb - va
	}
	if (metric === 'avgLoss') {
		return [...metrics].sort((a, b) => nanLast(a, b, metric, true))
	}
	return [...metrics].sort((a, b) => nanLast(a, b, metric, false))
}

// Pour les tag groups : injecte les tags du groupe qui ont 0 trade
// Retourne un nouveau tableau avec les métriques existantes + les tags manquants (vides)
export const injectEmptyTagMetrics = (
	metrics: BreakdownMetrics[],
	dimension: string,
	tagGroups: { id: number; name: string; tags: { name: string }[] }[],
): BreakdownMetrics[] => {
	if (!isTagGroupDimension(dimension)) return metrics
	const groupName = getTagGroupName(dimension)
	const group = tagGroups.find(g => g.name === groupName)
	if (!group) return metrics
	const existingKeys = new Set(metrics.map(m => m.key))
	const result = [...metrics]
	for (const tag of group.tags) {
		if (!existingKeys.has(tag.name)) {
			result.push(createEmptyMetrics(tag.name))
		}
	}
	return result
}

// Calcule le max drawdown et le drawdown actuel d'une série de trades (triés par date)
// dd = max(peak - cumulative) — négatif ou 0
// Retourne [maxDrawdown, currentDrawdown]
const calculateDrawdowns = (trades: TradeExtendedType[], pnlField: 'netProfit' | 'profit'): { maxDrawdown: number, currentDrawdown: number } => {
	if (trades.length === 0) return { maxDrawdown: 0, currentDrawdown: 0 }
	const sorted = [...trades].sort((a, b) => new Date(a.openDate).getTime() - new Date(b.openDate).getTime())
	let peak = 0
	let cumulative = 0
	let maxDd = 0
	for (const t of sorted) {
		cumulative += t[pnlField] || 0
		if (cumulative > peak) peak = cumulative
		const dd = cumulative - peak
		if (dd < maxDd) maxDd = dd
	}
	// currentDrawdown = distance entre le dernier peak et le cumul actuel
	const currentDrawdown = cumulative - peak
	return { maxDrawdown: maxDd, currentDrawdown }
}

// Calcule les métriques pour un ensemble de trades groupés par dimension
// groupFn détermine la dimension (ticker, tag, side, month, day of week...)
export const calculateMetricsByDimension = (
	trades: TradeExtendedType[],
	groupFn: GroupFn,
	useNet: boolean = true,
): BreakdownMetrics[] => {
	const tradesByKey = new Map<string, TradeExtendedType[]>()

	for (const trade of trades) {
		const keys = groupFn(trade)
		for (const key of keys) {
			if (!tradesByKey.has(key)) {
				tradesByKey.set(key, [])
			}
			tradesByKey.get(key)!.push(trade)
		}
	}

	const metrics: BreakdownMetrics[] = []
	const pnlField = useNet ? 'netProfit' : 'profit'

	for (const [key, groupTrades] of tradesByKey) {
		const winningTrades = groupTrades.filter(t => (t[pnlField] || 0) > 0)
		const losingTrades = groupTrades.filter(t => (t[pnlField] || 0) < 0)

		const pnl = groupTrades.reduce((sum, t) => sum + (t[pnlField] || 0), 0)
		const totalProfit = winningTrades.reduce((sum, t) => sum + (t[pnlField] || 0), 0)
		const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t[pnlField] || 0), 0))

		const winningTradesCount = winningTrades.length
		const losingTradesCount = losingTrades.length
		const tradesCount = groupTrades.length

		const winrate = tradesCount > 0 ? (winningTradesCount / tradesCount) * 100 : 0

		const avgWin = winningTradesCount > 0 ? totalProfit / winningTradesCount : 0
		const avgLoss = losingTradesCount > 0 ? totalLoss / losingTradesCount : 0

		const profitFactor = totalLoss > 0
			? totalProfit / totalLoss
			: totalProfit > 0 ? Infinity : 0

		// Expectancy = (winrate * avgWin) - (lossrate * avgLoss)
		const lossRate = tradesCount > 0 ? losingTradesCount / tradesCount : 0
		const winRate = tradesCount > 0 ? winningTradesCount / tradesCount : 0
		const expectancy = (winRate * avgWin) - (lossRate * avgLoss)

		const avgDuration = groupTrades.length > 0
			? groupTrades.reduce((sum, t) => {
				const open = new Date(t.openDate).getTime()
				const close = new Date(t.closeDate).getTime()
				return sum + (close - open) / (1000 * 60)
			}, 0) / groupTrades.length
			: 0

		const tradesWithMfe = groupTrades.filter(t => t.mfe !== null && t.mfe !== undefined)
		const tradesWithMae = groupTrades.filter(t => t.mae !== null && t.mae !== undefined)

		const avgMfe = tradesWithMfe.length > 0
			? tradesWithMfe.reduce((sum, t) => sum + (t.mfe || 0), 0) / tradesWithMfe.length
			: null

		const avgMae = tradesWithMae.length > 0
			? tradesWithMae.reduce((sum, t) => sum + (t.mae || 0), 0) / tradesWithMae.length
			: null

		const { maxDrawdown, currentDrawdown } = calculateDrawdowns(groupTrades, pnlField)

		metrics.push({
			key,
			pnl,
			winrate,
			tradesCount,
			avgWin,
			avgLoss,
			profitFactor,
			avgDuration,
			avgMfe,
			avgMae,
			winningTradesCount,
			losingTradesCount,
			expectancy,
			drawdown: maxDrawdown,
			currentDrawdown,
		})
	}

	return metrics.sort((a, b) => b.pnl - a.pnl)
}

// Grouping 2D pour la heatmap : groupe par 2 dimensions et calcule les métriques pour chaque cellule
export interface HeatmapCell2D {
	keyX: string
	keyY: string
	metrics: BreakdownMetrics
}

export const calculateMetricsBy2Dimensions = (
	trades: TradeExtendedType[],
	groupFnX: GroupFn,
	groupFnY: GroupFn,
	useNet: boolean = true,
): HeatmapCell2D[] => {
	const tradesByKeys = new Map<string, { x: string, y: string, trades: TradeExtendedType[] }>()

	for (const trade of trades) {
		const keysX = groupFnX(trade)
		const keysY = groupFnY(trade)
		for (const kx of keysX) {
			for (const ky of keysY) {
				const cellKey = `${kx}|||${ky}`
				if (!tradesByKeys.has(cellKey)) {
					tradesByKeys.set(cellKey, { x: kx, y: ky, trades: [] })
				}
				tradesByKeys.get(cellKey)!.trades.push(trade)
			}
		}
	}

	const cells: HeatmapCell2D[] = []
	const pnlField = useNet ? 'netProfit' : 'profit'

	for (const { x, y, trades: groupTrades } of tradesByKeys.values()) {
		const winningTrades = groupTrades.filter(t => (t[pnlField] || 0) > 0)
		const losingTrades = groupTrades.filter(t => (t[pnlField] || 0) < 0)
		const pnl = groupTrades.reduce((sum, t) => sum + (t[pnlField] || 0), 0)
		const totalProfit = winningTrades.reduce((sum, t) => sum + (t[pnlField] || 0), 0)
		const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t[pnlField] || 0), 0))
		const winningTradesCount = winningTrades.length
		const losingTradesCount = losingTrades.length
		const tradesCount = groupTrades.length
		const winrate = tradesCount > 0 ? (winningTradesCount / tradesCount) * 100 : 0
		const avgWin = winningTradesCount > 0 ? totalProfit / winningTradesCount : 0
		const avgLoss = losingTradesCount > 0 ? totalLoss / losingTradesCount : 0
		const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0
		const lossRate = tradesCount > 0 ? losingTradesCount / tradesCount : 0
		const winRate = tradesCount > 0 ? winningTradesCount / tradesCount : 0
		const expectancy = (winRate * avgWin) - (lossRate * avgLoss)
		const avgDuration = groupTrades.length > 0
			? groupTrades.reduce((sum, t) => {
				const open = new Date(t.openDate).getTime()
				const close = new Date(t.closeDate).getTime()
				return sum + (close - open) / (1000 * 60)
			}, 0) / groupTrades.length
			: 0
		const { maxDrawdown, currentDrawdown } = calculateDrawdowns(groupTrades, pnlField)

		cells.push({
			keyX: x,
			keyY: y,
			metrics: {
				key: `${x}|||${y}`,
				pnl,
				winrate,
				tradesCount,
				avgWin,
				avgLoss,
				profitFactor,
				avgDuration,
				avgMfe: null,
				avgMae: null,
				winningTradesCount,
				losingTradesCount,
				expectancy,
				drawdown: maxDrawdown,
				currentDrawdown,
			},
		})
	}

	return cells
}

// Fonctions de grouping par dimension
export const groupByTicker: GroupFn = (t) => [t.symbol || 'Unknown']

// By Tag : un trade avec plusieurs tags compte dans chaque groupe (overlap)
// Un trade sans tag va dans 'untagged'
export const groupByTag: GroupFn = (t) => {
	if (!t.tags || t.tags.length === 0) return ['untagged']
	return t.tags.map(tag => tag.name)
}

// By Side : Long (buy) / Short (sell)
export const groupBySide: GroupFn = (t) => [t.type === 'buy' ? 'Long' : 'Short']

// By Month : numéro de mois (0-11) — groupe tous les trades d'un même mois toutes années confondues
// Utilise le timezone utilisateur si fourni, sinon le timezone du navigateur
export const groupByMonthOpen = (tz?: TimezoneSettings): GroupFn => (t) => {
	if (tz) {
		const { month } = getHourAndWeekdayInUserTimezone(new Date(t.openDate), tz.timezoneDisplay, tz.timezoneLocal, tz.timezoneUtcOffset)
		return [String(month)]
	}
	const d = new Date(t.openDate)
	return [String(d.getMonth())]
}

export const groupByMonthClose = (tz?: TimezoneSettings): GroupFn => (t) => {
	if (tz) {
		const { month } = getHourAndWeekdayInUserTimezone(new Date(t.closeDate), tz.timezoneDisplay, tz.timezoneLocal, tz.timezoneUtcOffset)
		return [String(month)]
	}
	const d = new Date(t.closeDate)
	return [String(d.getMonth())]
}

// By Month+Year : 'YYYY-MM' — groupe par mois et année (chronologique)
export const groupByMonthYearOpen = (tz?: TimezoneSettings): GroupFn => (t) => {
	if (tz) {
		const { year, month } = getHourAndWeekdayInUserTimezone(new Date(t.openDate), tz.timezoneDisplay, tz.timezoneLocal, tz.timezoneUtcOffset)
		return [`${year}-${String(month + 1).padStart(2, '0')}`]
	}
	const d = new Date(t.openDate)
	return [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`]
}

export const groupByMonthYearClose = (tz?: TimezoneSettings): GroupFn => (t) => {
	if (tz) {
		const { year, month } = getHourAndWeekdayInUserTimezone(new Date(t.closeDate), tz.timezoneDisplay, tz.timezoneLocal, tz.timezoneUtcOffset)
		return [`${year}-${String(month + 1).padStart(2, '0')}`]
	}
	const d = new Date(t.closeDate)
	return [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`]
}

// By Day of Week : index 0-6 (0=Sunday) — utilise le timezone utilisateur
export const groupByDayOfWeekOpen = (tz?: TimezoneSettings): GroupFn => (t) => {
	const { weekday } = getHourAndWeekdayInUserTimezone(
		new Date(t.openDate),
		tz?.timezoneDisplay,
		tz?.timezoneLocal,
		tz?.timezoneUtcOffset,
	)
	return [String(weekday)]
}

export const groupByDayOfWeekClose = (tz?: TimezoneSettings): GroupFn => (t) => {
	const { weekday } = getHourAndWeekdayInUserTimezone(
		new Date(t.closeDate),
		tz?.timezoneDisplay,
		tz?.timezoneLocal,
		tz?.timezoneUtcOffset,
	)
	return [String(weekday)]
}

// By Hour Start : '08h', '09h'... — heure d'ouverture (utilise le timezone utilisateur)
export const groupByHourStart = (tz?: TimezoneSettings): GroupFn => (t) => {
	const { hour } = getHourAndWeekdayInUserTimezone(
		new Date(t.openDate),
		tz?.timezoneDisplay,
		tz?.timezoneLocal,
		tz?.timezoneUtcOffset,
	)
	return [`${String(hour).padStart(2, '0')}h`]
}

// By Hour End : '08h', '09h'... — heure de clôture (utilise le timezone utilisateur)
export const groupByHourEnd = (tz?: TimezoneSettings): GroupFn => (t) => {
	const { hour } = getHourAndWeekdayInUserTimezone(
		new Date(t.closeDate),
		tz?.timezoneDisplay,
		tz?.timezoneLocal,
		tz?.timezoneUtcOffset,
	)
	return [`${String(hour).padStart(2, '0')}h`]
}

// By Tag Group : filtre les tags du trade par groupId, retourne le nom du tag
// Un trade sans tag de ce groupe n'est pas groupé (pas d'entrée 'untagged')
export const groupByTagGroup = (groupId: number): GroupFn => (t) => {
	if (!t.tags || t.tags.length === 0) return []
	const tagsInGroup = t.tags.filter(tag => tag.groupId === groupId)
	if (tagsInGroup.length === 0) return []
	return tagsInGroup.map(tag => tag.name)
}

// Map dimension → factory de groupFn (accepte timezone settings optionnels)
// Les dimensions non temporelles ignorent le paramètre tz
export const dimensionGroupFnFactories: Record<string, (tz?: TimezoneSettings) => GroupFn> = {
	ticker: () => groupByTicker,
	tag: () => groupByTag,
	side: () => groupBySide,
	monthOpen: groupByMonthOpen,
	monthClose: groupByMonthClose,
	monthYearOpen: groupByMonthYearOpen,
	monthYearClose: groupByMonthYearClose,
	dayOfWeekOpen: groupByDayOfWeekOpen,
	dayOfWeekClose: groupByDayOfWeekClose,
	hourStart: groupByHourStart,
	hourEnd: groupByHourEnd,
}

// Récupère la fonction de grouping pour une dimension (fixe ou tag group dynamique)
// Accepte optionnellement les settings de timezone pour les dimensions temporelles
export const getGroupFn = (
	dimension: string,
	tagGroups: { id: number; name: string }[] = [],
	tz?: TimezoneSettings,
): GroupFn => {
	// Dimension fixe
	const factory = dimensionGroupFnFactories[dimension]
	if (factory) return factory(tz)
	// Tag group dynamique : 'tagGroup_<name>'
	if (isTagGroupDimension(dimension)) {
		const groupName = getTagGroupName(dimension)
		const group = tagGroups.find(g => g.name === groupName)
		if (group) return groupByTagGroup(group.id)
	}
	// Fallback : groupe par clé brute
	return groupByTicker
}

export const useAnalytics = () => {
	// calculateMetricsByTicker délègue au générique calculateMetricsByDimension
	// (compatibilité avec l'existant — TickerBreakdownTable utilise encore TickerMetrics)
	const calculateMetricsByTicker = (trades: TradeExtendedType[], useNet: boolean = true): TickerMetrics[] => {
		return calculateMetricsByDimension(trades, groupByTicker, useNet)
			.map(m => ({ ...m, symbol: m.key }))
	}

	return {
		calculateMetricsByTicker
	}
}

export interface HourlyMetrics {
	hour: number
	pnl: number
	winrate: number
	tradesCount: number
	avgWin: number
	avgLoss: number
	profitFactor: number
	winningTradesCount: number
	losingTradesCount: number
}

export interface HourlyHeatmapCell {
	hour: number
	weekday: number
	pnl: number
	tradesCount: number
	winrate: number
}

export const calculateMetricsByHour = (
	trades: TradeExtendedType[],
	useNet: boolean = true,
	timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC' = 'CURRENT',
	timezoneLocal: string = 'Europe/Paris',
	timezoneUtcOffset: number = 0
): HourlyMetrics[] => {
	const tradesByHour = new Map<number, TradeExtendedType[]>()

	for (const trade of trades) {
		const { hour } = getHourAndWeekdayInUserTimezone(trade.openDate, timezoneMode, timezoneLocal, timezoneUtcOffset)
		if (!tradesByHour.has(hour)) {
			tradesByHour.set(hour, [])
		}
		tradesByHour.get(hour)!.push(trade)
	}

	const metrics: HourlyMetrics[] = []

	for (let hour = 0; hour < 24; hour++) {
		const hourTrades = tradesByHour.get(hour) || []

		const winningTrades = hourTrades.filter(t => (t.netProfit || 0) > 0)
		const losingTrades = hourTrades.filter(t => (t.netProfit || 0) < 0)

		const pnl = hourTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0)
		const totalProfit = winningTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0)
		const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0))

		const winningTradesCount = winningTrades.length
		const losingTradesCount = losingTrades.length
		const tradesCount = hourTrades.length

		const winrate = tradesCount > 0 ? (winningTradesCount / tradesCount) * 100 : 0

		const avgWin = winningTradesCount > 0
			? totalProfit / winningTradesCount
			: 0

		const avgLoss = losingTradesCount > 0
			? totalLoss / losingTradesCount
			: 0

		const profitFactor = totalLoss > 0
			? totalProfit / totalLoss
			: totalProfit > 0 ? Infinity : 0

		metrics.push({
			hour,
			pnl,
			winrate,
			tradesCount,
			avgWin,
			avgLoss,
			profitFactor,
			winningTradesCount,
			losingTradesCount
		})
	}

	return metrics
}

export const calculateHourlyHeatmapData = (
	trades: TradeExtendedType[],
	timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC' = 'CURRENT',
	timezoneLocal: string = 'Europe/Paris',
	timezoneUtcOffset: number = 0
): HourlyHeatmapCell[] => {
	const tradesByHourDay = new Map<string, TradeExtendedType[]>()

	for (const trade of trades) {
		const { hour, weekday } = getHourAndWeekdayInUserTimezone(trade.openDate, timezoneMode, timezoneLocal, timezoneUtcOffset)
		const key = `${hour}-${weekday}`
		if (!tradesByHourDay.has(key)) {
			tradesByHourDay.set(key, [])
		}
		tradesByHourDay.get(key)!.push(trade)
	}

	const cells: HourlyHeatmapCell[] = []

	for (let hour = 0; hour < 24; hour++) {
		for (let weekday = 1; weekday <= 7; weekday++) {
			const key = `${hour}-${weekday}`
			const cellTrades = tradesByHourDay.get(key) || []

			const winningTrades = cellTrades.filter(t => (t.netProfit || 0) > 0)
			const tradesCount = cellTrades.length
			const winrate = tradesCount > 0 ? (winningTrades.length / tradesCount) * 100 : 0
			const pnl = cellTrades.length > 0
				? cellTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0) / cellTrades.length
				: 0

			cells.push({
				hour,
				weekday,
				pnl,
				tradesCount,
				winrate
			})
		}
	}

	return cells
}
