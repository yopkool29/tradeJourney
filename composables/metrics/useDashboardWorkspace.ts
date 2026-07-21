import type { WorkspaceConfig, WorkspaceId } from '~/type'

// Extrait la logique de gestion du workspace actif du dashboard
// pour pouvoir la réutiliser dans d'autres composables (ex: useBreakdownConfig)
export const useDashboardWorkspace = () => {
	const dbStateStore = useDbStateStore()

	const workspaces = computed(() => dbStateStore.dashBoardFilters.workspaces || [])

	const activeWorkspaceId = computed({
		get: () => dbStateStore.dashBoardFilters.activeWorkspaceId || 'summary',
		set: (val: WorkspaceId) => {
			dbStateStore.dashBoardFilters = { ...dbStateStore.dashBoardFilters, activeWorkspaceId: val }
		},
	})

	const activeWorkspace = computed<WorkspaceConfig | undefined>(() =>
		workspaces.value.find(w => w.id === activeWorkspaceId.value) || workspaces.value[0]
	)

	const updateActiveWorkspace = (patch: Partial<WorkspaceConfig>) => {
		const updated = workspaces.value.map(w =>
			w.id === activeWorkspaceId.value ? { ...w, ...patch } : w
		)
		dbStateStore.dashBoardFilters = { ...dbStateStore.dashBoardFilters, workspaces: updated }
	}

	return {
		workspaces,
		activeWorkspaceId,
		activeWorkspace,
		updateActiveWorkspace,
	}
}
