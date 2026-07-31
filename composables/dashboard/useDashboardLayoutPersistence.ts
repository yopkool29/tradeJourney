import type { ComputedRef, Ref } from 'vue'
import type { ChartKey, DashboardGridItem, SectionKey, WorkspaceConfig } from '~/type'
import type { GridTemplateItem } from '~/utils/dashboard'
import type { DashboardBreakpoint } from '~/composables/dashboard/useDashboardGridLayout'

type GridLayoutRef = {
	getLayout: () => DashboardGridItem[]
}

export const useDashboardLayoutPersistence = (
	defaultItemsForBreakpoint: ComputedRef<GridTemplateItem[]>,
	activeChartVisibility: ComputedRef<Record<ChartKey, boolean>>,
	activeSectionVisibility: ComputedRef<Record<SectionKey, boolean>>,
	currentBreakpoint: Ref<DashboardBreakpoint>,
	updateActiveWorkspace: (patch: Partial<WorkspaceConfig>) => void,
) => {
	const gridLayoutRef = ref<GridLayoutRef | null>(null)

	const saveGridLayout = () => {
		const newLayout = gridLayoutRef.value?.getLayout()
		if (!newLayout) return
		const hiddenItems = defaultItemsForBreakpoint.value
			.filter(item => {
				if (item.i in activeChartVisibility.value) return !activeChartVisibility.value[item.i as ChartKey]
				if (item.i in activeSectionVisibility.value) return !activeSectionVisibility.value[item.i as SectionKey]
				return false
			})
			.map(item => ({ ...item, x: 0, y: 0 }))
		const saved = [...newLayout, ...hiddenItems]
		switch (currentBreakpoint.value) {
			case 'md':
				updateActiveWorkspace({ dashboardGridLayoutMd: saved })
				break
			case 'sm':
				updateActiveWorkspace({ dashboardGridLayoutSm: saved })
				break
			default:
				updateActiveWorkspace({ dashboardGridLayout: saved })
		}
	}

	return { gridLayoutRef, saveGridLayout }
}
