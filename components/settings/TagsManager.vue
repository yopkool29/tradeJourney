<template>
	<SettingsSection :title="$t('components.settings.tags.title')" :show-refresh="displayTitle" :loading="isLoading" @refresh="fetchGroups">
		<template #actions>
			<CommonModalDefault v-model:open="showAddGroup" :ui="{ overlay: 'z-[300]', content: 'z-[301]' }"
				:title="$t('components.settings.tags.add_group_modal')">
				<template #trigger>
					<UButton icon="i-lucide-plus" size="xs" @click="newGroup">{{
						$t('components.settings.tags.add_group') }}</UButton>
				</template>
				<template #content>
					<UForm id="createGroupForm" :state="newGroupState" :validate-on="['change', 'input']"
						:schema="CreateTagGroupSchema" @submit.prevent="onSubmitGroup">
						<CommonAlertBox :success-str="successStr" :error-str="errorStr" />
						<UFormField name="name" :label="$t('components.settings.tags.group_name_label')" class="mb-3">
							<UInput v-model="newGroupState.name"
								:placeholder="$t('components.settings.tags.group_name_placeholder')" autofocus />
						</UFormField>
					</UForm>
				</template>
				<template #footer>
					<div class="action-buttons-end">
						<UButton type="submit" form="createGroupForm" :disabled="!newGroupState.name">{{
							$t('common.actions.save') }}</UButton>
						<UButton type="button" variant="soft" @click.prevent="() => { showAddGroup = false }">{{
							$t('common.actions.cancel') }}</UButton>
					</div>
				</template>
			</CommonModalDefault>
		</template>

		<template #alert>
			<CommonAlertBox :success-str="successStr" :error-str="errorStr" />
		</template>

		<div v-if="tagGroups.length === 0" class="text-muted text-center py-4">{{
			$t('components.settings.tags.no_tags') }}
		</div>
		<div class="flex flex-col gap-6">
			<div v-for="group in sortedTagGroups" :key="group.id"
				class="p-4 border border-default rounded-lg">
				<div class="flex items-center justify-between mb-3">
					<div class="form-row-lg">
						<div class="flex items-center gap-1">
							<UButton icon="i-lucide-chevron-up" size="md" color="neutral" variant="ghost"
								:disabled="sortedTagGroups.indexOf(group) === 0" @click="moveGroup(group, -1)" />
							<UButton icon="i-lucide-chevron-down" size="md" color="neutral" variant="ghost"
								:disabled="sortedTagGroups.indexOf(group) === sortedTagGroups.length - 1"
								@click="moveGroup(group, 1)" />
						</div>
						<span class="font-semibold text-lg">{{ group.name }}</span>

						<CommonModalDefault :ui="{ overlay: 'z-[300]', content: 'z-[301]' }"
							:open="editGroupStateId === group.id" :title="$t('components.settings.tags.edit_group')"
							@update:open="(open) => { if (!open) editGroupStateId = null }">
							<template #trigger>
								<UButton icon="i-lucide-edit" size="xs" color="neutral" variant="soft"
									@click.stop="editGroup(group)">
									{{ $t('components.settings.tags.edit_group') }}
								</UButton>
							</template>
							<template #content>
								<UForm id="modifyGroupForm" :state="newGroupState" :schema="UpdateTagGroupSchema"
									:validate-on="['change', 'input']" @submit="onSubmitGroup">
									<CommonAlertBox :success-str="successStr" :error-str="errorStr" />
									<UFormField name="name" :label="$t('components.settings.tags.group_name_label')"
										class="mb-3">
										<UInput v-model="newGroupState.name"
											:placeholder="$t('components.settings.tags.group_name_placeholder')"
											autofocus />
									</UFormField>
								</UForm>
							</template>
							<template #footer>
								<div class="action-buttons-end">
									<UButton type="submit" form="modifyGroupForm" :disabled="!newGroupState?.name">
										{{
											$t('common.actions.save') }}</UButton>
									<UButton variant="soft" @click="editGroupStateId = null">{{
										$t('common.actions.cancel') }}</UButton>
								</div>
							</template>
						</CommonModalDefault>

						<CommonModalDelete :ui="{ overlay: 'z-[300]', content: 'z-[301]' }"
							:open="groupToDelete?.id === group.id" @confirm="onDeleteGroup(group)"
							@opened="deleteAssoc = false">
							<template #trigger>
								<UButton icon="i-heroicons-trash" size="xs" color="error" variant="soft"
									@click.stop="groupToDelete = group">
									{{ $t('components.settings.tags.delete_group') }}
								</UButton>
							</template>
							<template #content>
								<div class="flex flex-col gap-2">
									<p>{{ $t('components.settings.tags.confirm_delete_group', {
										name:
											groupToDelete?.name
									}) }}</p>
									<UCheckbox v-model="deleteAssoc"
										:label="$t('components.settings.tags.delete_associations')" />
								</div>
							</template>
						</CommonModalDelete>
						<div class="w-px h-5 bg-default mx-1" />
						<CommonModalDefault :ui="{ overlay: 'z-[300]', content: 'z-[301]' }"
							:open="groupTagToAdd?.id == group.id" :title="$t('components.settings.tags.add_tag')"
							@update:open="(open) => { if (!open) groupTagToAdd = null }">
							<template #trigger>
								<UButton icon="i-lucide-plus" size="xs" color="primary" variant="soft"
									@click="() => { newAddTag(group) }">
									{{ $t('components.settings.tags.add_tag') }}
								</UButton>
							</template>
							<template #content>
								<UForm id="createTagForm" :state="newTagState" :validate-on="['change', 'input']"
									:schema="CreateTagSchema" @submit.prevent="onSubmitTag">
									<CommonAlertBox :success-str="successStr" :error-str="errorStr" />
									<UFormField name="name" :label="$t('components.settings.tags.tag_name_label')"
										class="mb-3">
										<UInput v-model="newTagState.name"
											:placeholder="$t('components.settings.tags.tag_name_placeholder')"
											autofocus />
									</UFormField>
									<UFormField name="description"
										:label="$t('components.settings.tags.tag_description_label')" class="mb-3">
										<UInput v-model="newTagState.description"
											:placeholder="$t('components.settings.tags.tag_description_placeholder')" />
									</UFormField>
									<UFormField name="color" :label="$t('components.settings.tags.tag_color_label')"
										class="mb-3">
										<CommonRecentColorPicker v-model="newTagState.color" />
									</UFormField>
								</UForm>
								<div class="modal-content-gap">
									<UCheckbox v-model="newTagState.dark_fg_reverse"
										:label="$t('components.settings.tags.tag_dark_fg_reverse_label')"
										:disabled="!isDark" class="opacity-100" />
									<div class="flex gap-2">
										<div class="text-md">{{ $t('components.settings.tags.result') }}:</div>
										<UBadge :label="newTagState.name"
											:style="getTagStyle(newTagState)"
											:title="newTagState.description || newTagState.name" />
									</div>
								</div>
							</template>
							<template #footer>
								<div class="action-buttons-end">
									<UButton type="submit" form="createTagForm" :disabled="!newTagState.name">{{
										$t('common.actions.save') }}</UButton>
									<UButton variant="soft" @click="groupTagToAdd = null">{{
										$t('common.actions.cancel')
									}}</UButton>
								</div>
							</template>
						</CommonModalDefault>
					</div>
				</div>
				<div class="flex flex-col gap-2 mt-6 w-fit">
					<div v-for="tag in group.tags" :key="tag.id"
						class="px-4 py-2 text-sm flex items-center gap-4 rounded-lg" :title="tag.description">
						<CommonModalDefault :ui="{ overlay: 'z-[300]', content: 'z-[301]' }"
							:open="editTagStateId === tag.id" :title="$t('components.settings.tags.edit_tag')"
							@update:open="(open) => { if (!open) editTagStateId = null }">
							<template #trigger>
								<UButton icon="i-lucide-edit" size="xs" color="neutral" variant="link"
									@click="editTag(group, tag)">
									{{ $t('components.settings.tags.edit_tag') }}
								</UButton>
							</template>
							<template #content>
								<UForm id="modifyTagForm" :state="newTagState" :validate-on="['change', 'input']"
									:schema="UpdateTagSchema" @submit.prevent="onSubmitTag">
									<CommonAlertBox :success-str="successStr" :error-str="errorStr" />
									<UFormField name="name" :label="$t('components.settings.tags.tag_name_label')"
										class="mb-3">
										<UInput v-model="newTagState.name"
											:placeholder="$t('components.settings.tags.tag_name_placeholder')"
											autofocus />
									</UFormField>
									<UFormField name="description"
										:label="$t('components.settings.tags.tag_description_label')" class="mb-3">
										<UInput v-model="newTagState.description"
											:placeholder="$t('components.settings.tags.tag_description_placeholder')" />
									</UFormField>
									<UFormField name="color" :label="$t('components.settings.tags.tag_color_label')"
										class="mb-3">
										<CommonRecentColorPicker v-model="newTagState.color" />
									</UFormField>
									<div class="modal-content-gap">
										<UCheckbox v-model="newTagState.dark_fg_reverse"
											:label="$t('components.settings.tags.tag_dark_fg_reverse_label')"
											:disabled="!isDark" class="opacity-100" />
										<div class="action-buttons">
											<div class="text-md">{{ $t('components.settings.tags.result') }}:</div>
											<UBadge :label="newTagState.name"
												:style="getTagStyle(newTagState)"
												:title="newTagState.description || newTagState.name" />
										</div>
									</div>
								</UForm>
							</template>
							<template #footer>
								<div class="action-buttons-end">
									<UButton type="submit" form="modifyTagForm" :disabled="!newTagState?.name">{{
										$t('common.actions.save') }}</UButton>
									<UButton variant="soft" @click="editTagStateId = null">{{
										$t('common.actions.cancel') }}</UButton>
								</div>
							</template>
						</CommonModalDefault>

						<CommonModalDelete :ui="{ overlay: 'z-[300]', content: 'z-[301]' }"
							:open="tagToDelete?.id === tag.id" @confirm="onDeleteTag(group, tag)"
							@opened="deleteAssoc = false">
							<template #trigger>
								<UButton icon="i-heroicons-trash" size="xs" color="error" variant="link"
									@click.stop="tagToDelete = tag">
									{{ $t('components.settings.tags.delete_tag') }}
								</UButton>
							</template>
							<template #content>
								<div class="flex flex-col gap-2">
									<p>{{ $t('components.settings.tags.confirm_delete_tag', {
										name:
											tagToDelete?.name
									})
									}}</p>
									<UCheckbox v-model="deleteAssoc"
										:label="$t('components.settings.tags.delete_associations')" />
								</div>
							</template>
						</CommonModalDelete>

						<UBadge :label="tag.name"
							:style="{ backgroundColor: tag.color != '' ? tag.color : '#333', ...(tag.dark_fg_reverse ? { color: '#fff' } : {}) }"
							class="badge-clickable"
							:title="tag.description || tag.name"
							@click="editTag(group, tag)" />
					</div>
				</div>
			</div>
		</div>
	</SettingsSection>
</template>

<script setup lang="ts">
import { useTagsManager } from '~/composables/settings/useTagsManager'

const emit = defineEmits<{ 'tags-updated': [] }>()
const isDark = useIsDark()
const { getTagStyle } = useTags()

const {
	CreateTagSchema, UpdateTagSchema,
	CreateTagGroupSchema, UpdateTagGroupSchema,
	sortedTagGroups, tagGroups, isLoading, fetchGroups,
	errorStr, successStr,
	deleteAssoc,
	newGroupState, editGroupStateId, showAddGroup,
	groupToDelete, groupTagToAdd,
	newTagState, editTagStateId, tagToDelete,
	newGroup, editGroup, onSubmitGroup, onDeleteGroup, moveGroup,
	newAddTag, editTag, onSubmitTag, onDeleteTag,
} = useTagsManager(emit)

defineProps({
	displayTitle: {
		type: Boolean,
		required: false,
		default: true
	}
})

onMounted(async () => {
	await fetchGroups()
})
</script>
