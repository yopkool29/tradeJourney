import type { TradeFilter } from '~/type'
import { parseDateStringToTimestamp } from '~/utils/date-utils'

export const transformAdvancedFilters = (filters: TradeFilter[]): TradeFilter[] => {
	const validFilters = filters.filter(f => f.value !== '' && f.value !== null && f.value !== undefined && !(Array.isArray(f.value) && f.value.length === 0))
	return validFilters.map(filter => {
		if (filter.column && filter.column.includes('Date') && typeof filter.value === 'string' && filter.value.trim() !== '') {
			return { ...filter, value: parseDateStringToTimestamp(filter.value) }
		} else if (filter.column === 'symbol' && Array.isArray(filter.value)) {
			return { ...filter, value: (filter.value as string[]).map(s => s.toUpperCase()) }
		} else if (filter.column === 'symbol' && typeof filter.value === 'string' && filter.value.trim() !== '') {
			return { ...filter, value: filter.value.trim().toUpperCase() }
		} else if (filter.column === 'type' && typeof filter.value === 'string' && filter.value.trim() !== '') {
			return { ...filter, value: filter.value.trim().toLowerCase() as 'buy' | 'sell' }
		} else if (filter.column === 'profit' && typeof filter.value === 'string' && filter.value.trim() !== '') {
			return { ...filter, value: parseFloat(filter.value.trim()) }
		}
		return { ...filter }
	})
}
