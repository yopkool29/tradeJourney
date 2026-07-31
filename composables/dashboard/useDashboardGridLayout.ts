import type { Component, ComputedRef, Ref } from 'vue'
import type { ChartKey, DashboardGridItem, SectionKey, WorkspaceConfig } from '~/type'
import {
	defaultGridItemsLg,
	defaultGridItemsMd,
	defaultGridItemsSm,
	type GridTemplateItem,
} from '~/utils/dashboard'
import DashboardChartsBreakdownBreakdownWidget from '~/components/dashboard/charts/breakdown/BreakdownWidget.vue'
import DashboardChartsTimeseriesTimeSeriesWidget from '~/components/dashboard/charts/timeseries/TimeSeriesWidget.vue'
import DashboardChartsCalendarCalendarWidget from '~/components/dashboard/charts/calendar/CalendarWidget.vue'
import DashboardSectionsAllTradesSection from '~/components/dashboard/sections/AllTradesSection.vue'
import DashboardSectionsProfitTradesSection from '~/components/dashboard/sections/ProfitTradesSection.vue'
import DashboardSectionsLosingTradesSection from '~/components/dashboard/sections/LosingTradesSection.vue'
import DashboardSectionsWinLossComparisonSection from '~/components/dashboard/sections/WinLossComparisonSection.vue'
import DashboardSectionsRiskRatiosSection from '~/components/dashboard/sections/RiskRatiosSection.vue'
import DashboardSectionsDayStatisticsSection from '~/components/dashboard/sections/DayStatisticsSection.vue'

export type DashboardBreakpoint = 'lg' | 'md' | 'sm'

type VisibleItemMaps = {
	chartVisibility: Record<ChartKey, boolean>
	sectionVisibility: Record<SectionKey, boolean>
}

type DashboardComponentProps = {
	itemId: string
	startingCapital?: number | null
}

const fixedComponentMap: Record<string, Component> = {
	allTrades: DashboardSectionsAllTradesSection,
	profitTrades: DashboardSectionsProfitTradesSection,
	losingTrades: DashboardSectionsLosingTradesSection,
	winLossComparison: DashboardSectionsWinLossComparisonSection,
	riskRatios: DashboardSectionsRiskRatiosSection,
	dayStatistics: DashboardSectionsDayStatisticsSection,
}

const isVisible = (itemId: string, visibility: VisibleItemMaps): boolean => {
	if (itemId in visibility.chartVisibility) return visibility.chartVisibility[itemId as ChartKey]
	if (itemId in visibility.sectionVisibility) return visibility.sectionVisibility[itemId as SectionKey]
	return false
}

const appendMissingItems = (items: GridTemplateItem[], columns: number, startY: number): DashboardGridItem[] => {
	const result: DashboardGridItem[] = []
	let currentX = 0
	let currentY = startY
	let rowHeight = 0
	for (const item of items) {
		if (currentX + item.w > columns) {
			currentX = 0
			currentY += rowHeight
			rowHeight = 0
		}
		result.push({ ...item, x: currentX, y: currentY })
		currentX += item.w
		rowHeight = Math.max(rowHeight, item.h)
	}
	return result
}

export const useDashboardBreakpoint = () => {
	const currentBreakpoint = ref<DashboardBreakpoint>('lg')
	const updateBreakpoint = () => {
		const width = window.innerWidth
		if (width >= 1024) currentBreakpoint.value = 'lg'
		else if (width >= 530) currentBreakpoint.value = 'md'
		else currentBreakpoint.value = 'sm'
	}
	onMounted(() => {
		updateBreakpoint()
		window.addEventListener('resize', updateBreakpoint)
	})
	onBeforeUnmount(() => window.removeEventListener('resize', updateBreakpoint))
	return { currentBreakpoint }
}

export const getDashboardGridComponents = (instanceKeys: string[]): Record<string, Component> => {
	const dynamicComponents: Record<string, Component> = {}
	for (const key of instanceKeys) {
		dynamicComponents[key] = key.startsWith('timeSeries')
			? DashboardChartsTimeseriesTimeSeriesWidget
			: key.startsWith('breakdownCalendar')
				? DashboardChartsCalendarCalendarWidget
				: DashboardChartsBreakdownBreakdownWidget
	}
	return { ...fixedComponentMap, ...dynamicComponents }
}

export const getDashboardComponentProps = (
	instanceKeys: string[],
	startingCapital: number | null | undefined,
): Record<string, DashboardComponentProps> => Object.fromEntries(
	instanceKeys.map(key => [key, key.startsWith('timeSeries') ? { itemId: key, startingCapital } : { itemId: key }]),
)

export const useDashboardGridLayout = (
	activeWorkspace: ComputedRef<WorkspaceConfig | undefined>,
	activeChartVisibility: ComputedRef<Record<ChartKey, boolean>>,
	activeSectionVisibility: ComputedRef<Record<SectionKey, boolean>>,
	currentBreakpoint: Ref<DashboardBreakpoint>,
) => {
	const gridColNum = computed(() => currentBreakpoint.value === 'md' ? 6 : currentBreakpoint.value === 'sm' ? 3 : 12)
	const defaultItemsForBreakpoint = computed(() => {
		switch (currentBreakpoint.value) {
			case 'md': return defaultGridItemsMd
			case 'sm': return defaultGridItemsSm
			default: return defaultGridItemsLg
		}
	})
	const gridLayout = computed(() => {
		const workspace = activeWorkspace.value
		const visibility = { chartVisibility: activeChartVisibility.value, sectionVisibility: activeSectionVisibility.value }
		const savedLayout = currentBreakpoint.value === 'md'
			? workspace?.dashboardGridLayoutMd
			: currentBreakpoint.value === 'sm' ? workspace?.dashboardGridLayoutSm : workspace?.dashboardGridLayout
		if (savedLayout && savedLayout.length > 0) {
			const savedKeys = new Set(savedLayout.map(item => item.i))
			const visibleSaved = savedLayout.filter(item => isVisible(item.i, visibility))
			const missingVisible = defaultItemsForBreakpoint.value.filter(item => !savedKeys.has(item.i) && isVisible(item.i, visibility))
			const maxY = visibleSaved.reduce((max, item) => Math.max(max, (item.y ?? 0) + item.h), 0)
			return [...visibleSaved, ...appendMissingItems(missingVisible, gridColNum.value, maxY)]
		}
		return appendMissingItems(defaultItemsForBreakpoint.value.filter(item => isVisible(item.i, visibility)), gridColNum.value, 0)
	})
	return { gridColNum, defaultItemsForBreakpoint, gridLayout }
}
