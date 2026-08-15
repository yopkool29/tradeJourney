import type { ChartKey, DashBoardFilters, SectionKey, WorkspaceConfig, WorkspaceId } from '~/type'

export const useDashboardWorkspace = () => {
	const dbStateStore = useDbStateStore()
	const { currentDatabase, databases, fetchDatabases } = useDatabase()
	const { t } = useI18n()
	const { success: toastSuccess } = useAppToast()
	const { getDefaultChartVisibility } = useMetricsChartRegistry()
	const { getDefaultSectionVisibility } = useMetricsSectionRegistry()
	const workspaces = computed(() => dbStateStore.dashBoardFilters.workspaces || [])
	const activeWorkspaceId = computed({
		get: () => dbStateStore.dashBoardFilters.activeWorkspaceId || 'summary',
		set: (value: WorkspaceId) => {
			dbStateStore.dashBoardFilters = { ...dbStateStore.dashBoardFilters, activeWorkspaceId: value }
		},
	})
	const activeWorkspace = computed<WorkspaceConfig | undefined>(() =>
		workspaces.value.find(workspace => workspace.id === activeWorkspaceId.value) || workspaces.value[0],
	)
	const updateActiveWorkspace = (patch: Partial<WorkspaceConfig>) => {
		const updated = workspaces.value.map(workspace =>
			workspace.id === activeWorkspaceId.value ? { ...workspace, ...patch } : workspace,
		)
		dbStateStore.dashBoardFilters = { ...dbStateStore.dashBoardFilters, workspaces: updated }
	}
	const emptyChartVisibility = Object.fromEntries(
		Object.keys(getDefaultChartVisibility()).map(key => [key, false]),
	) as Record<ChartKey, boolean>
	const emptySectionVisibility = Object.fromEntries(
		Object.keys(getDefaultSectionVisibility()).map(key => [key, false]),
	) as Record<SectionKey, boolean>
	const workspaceRenameValue = ref(activeWorkspace.value?.name || '')
	watch(activeWorkspace, workspace => {
		workspaceRenameValue.value = workspace?.name || ''
	})

	const addWorkspace = () => {
		if (workspaces.value.length >= 5) return
		const id = `workspace-${Date.now()}`
		const newWorkspace: WorkspaceConfig = {
			id,
			name: `Workspace ${workspaces.value.length + 1}`,
			dashboardChartVisibilityLg: { ...emptyChartVisibility },
			dashboardChartVisibilityMd: { ...emptyChartVisibility },
			dashboardChartVisibilitySm: { ...emptyChartVisibility },
			dashboardSectionVisibilityLg: { ...emptySectionVisibility },
			dashboardSectionVisibilityMd: { ...emptySectionVisibility },
			dashboardSectionVisibilitySm: { ...emptySectionVisibility },
			dashboardGridLayout: [],
			dashboardGridLayoutMd: [],
			dashboardGridLayoutSm: [],
		}
		dbStateStore.dashBoardFilters = {
			...dbStateStore.dashBoardFilters,
			workspaces: [...workspaces.value, newWorkspace],
			activeWorkspaceId: id,
		}
	}
	const removeWorkspace = (id: WorkspaceId) => {
		if (id === 'summary') return
		dbStateStore.dashBoardFilters = {
			...dbStateStore.dashBoardFilters,
			workspaces: workspaces.value.filter(workspace => workspace.id !== id),
			activeWorkspaceId: activeWorkspaceId.value === id ? 'summary' : activeWorkspaceId.value,
		}
	}
	const renameActiveWorkspace = () => {
		const name = workspaceRenameValue.value.trim()
		if (name && name !== activeWorkspace.value?.name) updateActiveWorkspace({ name })
	}
	const cancelRenameWorkspace = () => {
		workspaceRenameValue.value = activeWorkspace.value?.name || ''
	}
	const resetLayout = () => {
		if (activeWorkspaceId.value === 'summary') {
			updateActiveWorkspace(getDefaultSummaryState())
			return
		}
		updateActiveWorkspace({
			dashboardChartVisibilityLg: { ...emptyChartVisibility },
			dashboardChartVisibilityMd: { ...emptyChartVisibility },
			dashboardChartVisibilitySm: { ...emptyChartVisibility },
			dashboardSectionVisibilityLg: { ...emptySectionVisibility },
			dashboardSectionVisibilityMd: { ...emptySectionVisibility },
			dashboardSectionVisibilitySm: { ...emptySectionVisibility },
			dashboardGridLayout: [],
			dashboardGridLayoutMd: [],
			dashboardGridLayoutSm: [],
		})
	}
	const getDatabases = async () => {
		if (databases.value.length === 0) await fetchDatabases()
		return databases.value
	}
	const syncDashboardToOtherDatabases = async () => {
		const currentDbName = currentDatabase.value?.name || 'default'
		const sourceFilters = dbStateStore.dashBoardFiltersPerDb[currentDbName]
		if (!sourceFilters?.workspaces) return
		const newPerDb = { ...dbStateStore.dashBoardFiltersPerDb }
		for (const db of await getDatabases()) {
			if (db.name === currentDbName) continue
			const clonedWorkspaces = JSON.parse(JSON.stringify(sourceFilters.workspaces)) as WorkspaceConfig[]
			if (newPerDb[db.name]) {
				newPerDb[db.name] = { ...newPerDb[db.name], workspaces: clonedWorkspaces }
			} else {
				newPerDb[db.name] = { ...JSON.parse(JSON.stringify(sourceFilters)) as DashBoardFilters }
			}
		}
		dbStateStore.dashBoardFiltersPerDb = newPerDb
		toastSuccess(t('components.dashboard.index.sync_dashboard_success'))
	}
	const syncActiveWorkspaceToOtherDatabases = async () => {
		const workspace = activeWorkspace.value
		if (!workspace) return
		const currentDbName = currentDatabase.value?.name || 'default'
		const sourceFilters = dbStateStore.dashBoardFiltersPerDb[currentDbName]
		if (!sourceFilters) return
		const newPerDb = { ...dbStateStore.dashBoardFiltersPerDb }
		for (const db of await getDatabases()) {
			if (db.name === currentDbName) continue
			const existing = newPerDb[db.name]
			if (!existing) {
				newPerDb[db.name] = JSON.parse(JSON.stringify(sourceFilters)) as DashBoardFilters
				continue
			}
			const newWorkspaces = existing.workspaces ? [...existing.workspaces] : []
			const index = newWorkspaces.findIndex(item => item.id === workspace.id)
			const clonedWorkspace = JSON.parse(JSON.stringify(workspace)) as WorkspaceConfig
			if (index >= 0) newWorkspaces[index] = clonedWorkspace
			else newWorkspaces.push(clonedWorkspace)
			newPerDb[db.name] = { ...existing, workspaces: newWorkspaces }
		}
		dbStateStore.dashBoardFiltersPerDb = newPerDb
		toastSuccess(t('components.dashboard.index.sync_workspace_success'))
	}

	return {
		workspaces,
		activeWorkspaceId,
		activeWorkspace,
		updateActiveWorkspace,
		workspaceRenameValue,
		addWorkspace,
		removeWorkspace,
		renameActiveWorkspace,
		cancelRenameWorkspace,
		resetLayout,
		syncDashboardToOtherDatabases,
		syncActiveWorkspaceToOtherDatabases,
	}
}
