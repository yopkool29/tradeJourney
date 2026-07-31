import type { TradeExtendedType } from '~/schema/trade'
import { isTagGroupDimension, getTagGroupName } from '~/type'
import { getHourAndWeekdayInUserTimezone } from '~/utils/date-utils'
import type { TimezoneSettings } from '~/composables/analytics/useAnalytics'

export type GroupFn = (trade: TradeExtendedType) => string[]

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
