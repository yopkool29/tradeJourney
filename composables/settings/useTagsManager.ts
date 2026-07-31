import type { FormSubmitEvent } from '@nuxt/ui'
import type { TagType, CreateTagType, UpdateTagType } from '~/schema/tag'
import { CreateTagSchema, UpdateTagSchema } from '~/schema/tag'
import type { TagGroupType, CreateTagGroupType, UpdateTagGroupType } from '~/schema/tagGroup'
import { CreateTagGroupSchema, UpdateTagGroupSchema } from '~/schema/tagGroup'

export const useTagsManager = (emit: (event: 'tags-updated') => void) => {
	const { t } = useI18n()
	const dbStateStore = useDbStateStore()
	const { log_error: _log_error } = useLogView()
	const { errorStr, successStr, displayMessage } = useAlert()
	const { fetchGroups: fetchGroupsBase, createGroup, updateGroup, deleteGroup, createTag, updateTag, deleteTag, reorderGroups, tagGroups } = useTags()

	const sortedTagGroups = computed(() => {
		return tagGroups.value.map(group => ({
			...group,
			tags: [...group.tags].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
		}))
	})

	const isLoading = ref(false)

	const fetchGroups = async () => {
		isLoading.value = true
		try {
			return await fetchGroupsBase()
		} finally {
			isLoading.value = false
		}
	}

	const deleteAssoc = ref<boolean>(false)
	const lastDarkFgReverse = ref<boolean>(false)

	const getDefaultTagGroup = () => ({ name: '' })
	const getDefaultTag = () => ({ name: '', color: dbStateStore.recentColors[0] || undefined, dark_fg_reverse: lastDarkFgReverse.value, description: '' })

	const newGroupState = ref<CreateTagGroupType>(getDefaultTagGroup())
	const editGroupStateId = ref<number | null>(null)
	const showAddGroup = ref(false)
	const groupToDelete = ref<TagGroupType | null>(null)
	const groupTagToAdd = ref<TagGroupType | null>(null)

	const newTagState = ref<CreateTagType>(getDefaultTag())
	const editSaveGroupStateId = ref<number | null>(null)
	const editTagStateId = ref<number | null>(null)
	const tagToDelete = ref<TagType | null>(null)

	const onColorPicked = (color: string) => {
		if (!color) return
		dbStateStore.recentColors = [color, ...dbStateStore.recentColors.filter((c) => c !== color)].slice(0, 10)
	}

	const newGroup = () => {
		displayMessage(null, null)
		deleteAssoc.value = false
		editGroupStateId.value = null
		newGroupState.value = getDefaultTagGroup()
		showAddGroup.value = true
	}

	const editGroup = (group: TagGroupType) => {
		displayMessage(null, null)
		deleteAssoc.value = false
		editGroupStateId.value = group.id
		newGroupState.value = { ...group }
	}

	const onSubmitGroup = async (event: FormSubmitEvent<CreateTagGroupType | UpdateTagGroupType>) => {
		try {
			if (editGroupStateId.value) {
				await updateGroup(event.data as UpdateTagGroupType)
				displayMessage(t('components.settings.tags.group_updated'), null)
				await fetchGroups()
				editGroupStateId.value = null
			} else {
				await createGroup(event.data as CreateTagGroupType)
				displayMessage(t('components.settings.tags.group_created'), null)
				await fetchGroups()
				showAddGroup.value = false
			}
			emit('tags-updated')
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			displayMessage(null, message)
		}
	}

	const onDeleteGroup = async (group: TagGroupType) => {
		try {
			await deleteGroup(group.id, deleteAssoc.value)
			await fetchGroups()
			displayMessage(t('components.settings.tags.group_deleted'), null)
			emit('tags-updated')
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			displayMessage(null, message)
		}
	}

	const moveGroup = async (group: TagGroupType, direction: number) => {
		const index = tagGroups.value.findIndex(g => g.id === group.id)
		const newIndex = index + direction
		if (newIndex < 0 || newIndex >= tagGroups.value.length) return
		const reordered = [...tagGroups.value]
		reordered.splice(index, 1)
		reordered.splice(newIndex, 0, tagGroups.value[index])
		tagGroups.value = reordered
		try {
			await reorderGroups(reordered)
			await fetchGroups()
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			displayMessage(null, message)
		}
	}

	const newAddTag = (group: TagGroupType) => {
		displayMessage(null, null)
		deleteAssoc.value = false
		editSaveGroupStateId.value = group.id
		newTagState.value = getDefaultTag()
		groupTagToAdd.value = group
	}

	const editTag = (group: TagGroupType, tag: TagType) => {
		displayMessage(null, null)
		deleteAssoc.value = false
		editSaveGroupStateId.value = group.id
		editTagStateId.value = tag.id
		newTagState.value = { ...tag }
	}

	const onSubmitTag = async (event: FormSubmitEvent<CreateTagType | UpdateTagType>) => {
		try {
			if (editTagStateId.value) {
				await updateTag(editSaveGroupStateId.value!, editTagStateId.value, event.data as UpdateTagType)
				if (event.data.color) onColorPicked(event.data.color)
				lastDarkFgReverse.value = event.data.dark_fg_reverse ?? false
				displayMessage(t('components.settings.tags.tag_updated'), null)
				await fetchGroups()
				editTagStateId.value = null
			} else {
				await createTag(editSaveGroupStateId.value!, event.data as CreateTagType)
				if (event.data.color) onColorPicked(event.data.color)
				lastDarkFgReverse.value = event.data.dark_fg_reverse ?? false
				displayMessage(t('components.settings.tags.tag_created'), null)
				await fetchGroups()
				groupTagToAdd.value = null
			}
			emit('tags-updated')
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			displayMessage(null, message)
		}
	}

	const onDeleteTag = async (group: TagGroupType, tag: TagType) => {
		try {
			await deleteTag(group.id, tag.id, deleteAssoc.value)
			await fetchGroups()
			displayMessage(t('components.settings.tags.tag_deleted'), null)
			emit('tags-updated')
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			displayMessage(null, message)
		}
	}

	return {
		CreateTagSchema, UpdateTagSchema,
		CreateTagGroupSchema, UpdateTagGroupSchema,
		sortedTagGroups, tagGroups, isLoading, fetchGroups,
		errorStr, successStr, displayMessage,
		deleteAssoc,
		newGroupState, editGroupStateId, showAddGroup,
		groupToDelete, groupTagToAdd,
		newTagState, editSaveGroupStateId, editTagStateId, tagToDelete,
		newGroup, editGroup, onSubmitGroup, onDeleteGroup, moveGroup,
		newAddTag, editTag, onSubmitTag, onDeleteTag, onColorPicked,
	}
}
