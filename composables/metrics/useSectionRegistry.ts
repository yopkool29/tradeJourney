import type { SectionKey } from '~/type'

export interface SectionRegistration {
	id: SectionKey
	defaultVisible: boolean
}

const sectionRegistry: SectionRegistration[] = [
	{ id: 'allTrades', defaultVisible: true },
	{ id: 'profitTrades', defaultVisible: true },
	{ id: 'losingTrades', defaultVisible: true },
	{ id: 'winLossComparison', defaultVisible: true },
	{ id: 'tickerTable', defaultVisible: false },
	{ id: 'dayStatistics', defaultVisible: false },
]

export const useMetricsSectionRegistry = () => {
	const getSections = () => sectionRegistry
	const getDefaultSectionVisibility = (): Record<SectionKey, boolean> => {
		return sectionRegistry.reduce((acc, item) => {
			acc[item.id] = item.defaultVisible
			return acc
		}, {} as Record<SectionKey, boolean>)
	}

	return {
		getSections,
		getDefaultSectionVisibility,
	}
}
