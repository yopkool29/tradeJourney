import type { BreakdownDimension } from '~/type'

type Translate = (key: string) => string

export const formatDimensionLabel = (dimension: BreakdownDimension, key: string, translate: Translate): string => {
	if (dimension === 'dayOfWeekOpen' || dimension === 'dayOfWeekClose') {
		const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
		const index = parseInt(key, 10)
		if (index >= 0 && index <= 6) return translate(`common.weekdays.long.${dayKeys[index]}`)
		return key
	}
	if (dimension === 'monthOpen' || dimension === 'monthClose') {
		const index = parseInt(key, 10)
		if (index >= 0 && index <= 11) return translate(`common.months.long.${index}`)
		return key
	}
	if (dimension === 'monthYearOpen' || dimension === 'monthYearClose') {
		const [year, monthNumber] = key.split('-')
		const index = parseInt(monthNumber, 10) - 1
		if (index >= 0 && index <= 11) return `${translate(`common.months.long.${index}`)} ${year}`
	}
	return key
}
