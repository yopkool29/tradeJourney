import type { ChartKey, SectionKey, WorkspaceConfig } from '~/type'

export interface GridVisibilityConfig {
	chartVisibilityLg: Record<ChartKey, boolean>
	chartVisibilityMd: Record<ChartKey, boolean>
	chartVisibilitySm: Record<ChartKey, boolean>
	sectionVisibilityLg: Record<SectionKey, boolean>
	sectionVisibilityMd: Record<SectionKey, boolean>
	sectionVisibilitySm: Record<SectionKey, boolean>
}

export const useGridVisibility = (
	activeWorkspace: ComputedRef<WorkspaceConfig | null>,
	updateActiveWorkspace: (patch: Partial<WorkspaceConfig>) => void,
	currentBreakpoint: Ref<'lg' | 'md' | 'sm'>
) => {
	const chartVisibilityLg = computed({
		get: (): Record<ChartKey, boolean> => activeWorkspace.value?.dashboardChartVisibilityLg || {} as Record<ChartKey, boolean>,
		set: (val) => updateActiveWorkspace({ dashboardChartVisibilityLg: val }),
	})

	const chartVisibilityMd = computed({
		get: (): Record<ChartKey, boolean> => activeWorkspace.value?.dashboardChartVisibilityMd || {} as Record<ChartKey, boolean>,
		set: (val) => updateActiveWorkspace({ dashboardChartVisibilityMd: val }),
	})

	const chartVisibilitySm = computed({
		get: (): Record<ChartKey, boolean> => activeWorkspace.value?.dashboardChartVisibilitySm || {} as Record<ChartKey, boolean>,
		set: (val) => updateActiveWorkspace({ dashboardChartVisibilitySm: val }),
	})

	const sectionVisibilityLg = computed({
		get: (): Record<SectionKey, boolean> => activeWorkspace.value?.dashboardSectionVisibilityLg || {} as Record<SectionKey, boolean>,
		set: (val) => updateActiveWorkspace({ dashboardSectionVisibilityLg: val }),
	})

	const sectionVisibilityMd = computed({
		get: (): Record<SectionKey, boolean> => activeWorkspace.value?.dashboardSectionVisibilityMd || {} as Record<SectionKey, boolean>,
		set: (val) => updateActiveWorkspace({ dashboardSectionVisibilityMd: val }),
	})

	const sectionVisibilitySm = computed({
		get: (): Record<SectionKey, boolean> => activeWorkspace.value?.dashboardSectionVisibilitySm || {} as Record<SectionKey, boolean>,
		set: (val) => updateActiveWorkspace({ dashboardSectionVisibilitySm: val }),
	})

	const activeChartVisibility = computed(() => {
		switch (currentBreakpoint.value) {
			case 'md':
				return chartVisibilityMd.value
			case 'sm':
				return chartVisibilitySm.value
			default:
				return chartVisibilityLg.value
		}
	})

	const activeSectionVisibility = computed(() => {
		switch (currentBreakpoint.value) {
			case 'md':
				return sectionVisibilityMd.value
			case 'sm':
				return sectionVisibilitySm.value
			default:
				return sectionVisibilityLg.value
		}
	})

	const isItemVisible = (itemId: string): boolean => {
		if (itemId in activeChartVisibility.value) {
			return activeChartVisibility.value[itemId as ChartKey]
		}
		if (itemId in activeSectionVisibility.value) {
			return activeSectionVisibility.value[itemId as SectionKey]
		}
		return false
	}

	const syncVisibilityToAllBreakpoints = (
		chartVisibility: Record<ChartKey, boolean>,
		sectionVisibility: Record<SectionKey, boolean>
	) => {
		updateActiveWorkspace({
			dashboardChartVisibilityLg: { ...chartVisibility },
			dashboardChartVisibilityMd: { ...chartVisibility },
			dashboardChartVisibilitySm: { ...chartVisibility },
			dashboardSectionVisibilityLg: { ...sectionVisibility },
			dashboardSectionVisibilityMd: { ...sectionVisibility },
			dashboardSectionVisibilitySm: { ...sectionVisibility },
		})
	}

	return {
		chartVisibilityLg,
		chartVisibilityMd,
		chartVisibilitySm,
		sectionVisibilityLg,
		sectionVisibilityMd,
		sectionVisibilitySm,
		activeChartVisibility,
		activeSectionVisibility,
		isItemVisible,
		syncVisibilityToAllBreakpoints,
	}
}
