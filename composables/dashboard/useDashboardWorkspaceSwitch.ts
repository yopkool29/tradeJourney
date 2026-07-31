import type { WorkspaceId } from '~/type'

export const useDashboardWorkspaceSwitch = (
	isGridDraggable: Ref<boolean>,
	saveGridLayout: () => void,
) => {
	const switchingToWorkspaceId = ref<WorkspaceId | null>(null)
	const showUnsavedChangesModal = ref(false)
	const pendingWorkspaceSwitch = ref<WorkspaceId | null>(null)

	const switchWorkspace = async (id: WorkspaceId, activeWorkspaceId: Ref<WorkspaceId>) => {
		if (id === activeWorkspaceId.value) return
		if (isGridDraggable.value) {
			pendingWorkspaceSwitch.value = id
			showUnsavedChangesModal.value = true
			return
		}
		switchingToWorkspaceId.value = id
		await nextTick()
		setTimeout(() => {
			activeWorkspaceId.value = id
			setTimeout(() => {
				switchingToWorkspaceId.value = null
			}, 150)
		}, 0)
	}

	const onSaveAndSwitch = (activeWorkspaceId: Ref<WorkspaceId>) => {
		saveGridLayout()
		isGridDraggable.value = false
		showUnsavedChangesModal.value = false
		const id = pendingWorkspaceSwitch.value
		pendingWorkspaceSwitch.value = null
		if (id) switchWorkspace(id, activeWorkspaceId)
	}

	const onDiscardAndSwitch = (activeWorkspaceId: Ref<WorkspaceId>) => {
		isGridDraggable.value = false
		showUnsavedChangesModal.value = false
		const id = pendingWorkspaceSwitch.value
		pendingWorkspaceSwitch.value = null
		if (id) switchWorkspace(id, activeWorkspaceId)
	}

	const onCancelSwitch = () => {
		showUnsavedChangesModal.value = false
		pendingWorkspaceSwitch.value = null
	}

	return {
		switchingToWorkspaceId,
		showUnsavedChangesModal,
		pendingWorkspaceSwitch,
		switchWorkspace,
		onSaveAndSwitch,
		onDiscardAndSwitch,
		onCancelSwitch,
	}
}
