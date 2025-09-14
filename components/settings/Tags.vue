<template>
    <UCard class="mb-8 md:max-w-4xl min-w-md">
        <template #header>
            <div class="flex flex-col justify-between items-start gap-4">
                <span class="font-bold text-lg">{{ $t('components.settings.tags.title') }}</span>
                <CommonModalDefault v-model:open="showAddGroup" :title="$t('components.settings.tags.add_group_modal')">
                    <template #trigger>
                        <UButton icon="i-lucide-plus" size="xs" @click="newGroup">{{ $t('components.settings.tags.add_group') }}</UButton>
                    </template>
                    <template #content>
                        <UForm
                            id="createGroupForm1"
                            :state="newGroupState"
                            :validate-on="['change', 'input']"
                            :schema="CreateTagGroupSchema"
                            @submit.prevent="onSubmitGroup"
                        >
                            <UAlert v-if="errorStr" :description="errorStr || ''" color="error" variant="outline" class="mb-4" />
                            <UFormField name="name" :label="$t('components.settings.tags.group_name_label')" class="mb-3">
                                <UInput v-model="newGroupState.name" :placeholder="$t('components.settings.tags.group_name_placeholder')" autofocus />
                            </UFormField>
                        </UForm>
                    </template>
                    <template #footer>
                        <div class="flex justify-end gap-2">
                            <UButton type="submit" form="createGroupForm1" :disabled="!newGroupState.name">{{ $t('common.actions.save') }}</UButton>
                            <UButton
                                type="button"
                                variant="soft"
                                @click.prevent="
                                    () => {
                                        showAddGroup = false
                                    }
                                "
                                >{{ $t('common.actions.cancel') }}</UButton
                            >
                        </div>
                    </template>
                </CommonModalDefault>
            </div>
        </template>
        <div>
            <UAlert v-if="successStr" variant="outline" color="success" class="mb-4" :description="successStr || ''" />
            <UAlert v-if="errorStr" variant="outline" color="error" class="mb-4" :description="errorStr || ''" />

            <div v-if="tagGroups.length === 0" class="text-gray-500 text-center py-4">{{ $t('components.settings.tags.no_tags') }}</div>
            <div class="flex flex-col gap-6">
                <UCard v-for="group in tagGroups" :key="group.id" class="p-4">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-4">
                            <span class="font-semibold text-lg">{{ group.name }}</span>

                            <CommonModalDefault
                                :open="editGroupStateId === group.id"
                                :title="$t('components.settings.tags.edit_group')"
                                @update:open="
                                    (open) => {
                                        if (!open) editGroupStateId = null
                                    }
                                "
                            >
                                <template #trigger>
                                    <UButton icon="i-lucide-edit" size="xs" color="neutral" variant="soft" @click.stop="editGroup(group)">
                                        {{ $t('components.settings.tags.edit_group') }}
                                    </UButton>
                                </template>
                                <template #content>
                                    <UForm
                                        id="modifyGroupForm1"
                                        :state="newGroupState"
                                        :schema="UpdateTagGroupSchema"
                                        :validate-on="['change', 'input']"
                                        @submit="onSubmitGroup"
                                    >
                                        <UAlert v-if="errorStr" :description="errorStr || ''" color="error" variant="outline" class="mb-4" />
                                        <UFormField name="name" :label="$t('components.settings.tags.group_name_label')" class="mb-3">
                                            <UInput
                                                v-model="newGroupState.name"
                                                :placeholder="$t('components.settings.tags.group_name_placeholder')"
                                                autofocus
                                            />
                                        </UFormField>
                                    </UForm>
                                </template>
                                <template #footer>
                                    <div class="flex gap-2 justify-end">
                                        <UButton type="submit" form="modifyGroupForm1" :disabled="!newGroupState?.name">{{
                                            $t('common.actions.save')
                                        }}</UButton>
                                        <UButton variant="soft" @click="editGroupStateId = null">{{ $t('common.actions.cancel') }}</UButton>
                                    </div>
                                </template>
                            </CommonModalDefault>

                            <CommonModalDelete :open="groupToDelete?.id === group.id" @confirm="onDeleteGroup(group)" @opened="deleteAssoc = false">
                                <template #trigger>
                                    <UButton icon="i-heroicons-trash" size="xs" color="error" variant="soft" @click.stop="groupToDelete = group">
                                        {{ $t('components.settings.tags.delete_group') }}
                                    </UButton>
                                </template>
                                <template #content>
                                    <div class="flex flex-col gap-2">
                                        <p>{{ $t('components.settings.tags.confirm_delete_group', { name: groupToDelete?.name }) }}</p>
                                        <UCheckbox v-model="deleteAssoc">{{ $t('components.settings.tags.delete_associations') }}</UCheckbox>
                                    </div>
                                </template>
                            </CommonModalDelete>
                        </div>
                        <CommonModalDefault
                            :open="groupTagToAdd?.id == group.id"
                            :title="$t('components.settings.tags.add_tag')"
                            @update:open="
                                (open) => {
                                    if (!open) groupTagToAdd = null
                                }
                            "
                        >
                            <template #trigger>
                                <UButton
                                    icon="i-lucide-plus"
                                    size="xs"
                                    color="primary"
                                    variant="soft"
                                    @click="
                                        () => {
                                            newAddTag(group)
                                        }
                                    "
                                >
                                    {{ $t('components.settings.tags.add_tag') }}
                                </UButton>
                            </template>
                            <template #content>
                                <UForm
                                    id="createTagForm1"
                                    :state="newTagState"
                                    :validate-on="['change', 'input']"
                                    :schema="CreateTagSchema"
                                    @submit.prevent="onSubmitTag"
                                >
                                    <UAlert v-if="errorStr" :description="errorStr || ''" color="error" variant="outline" class="mb-4" />
                                    <UFormField name="name" :label="$t('components.settings.tags.tag_name_label')" class="mb-3">
                                        <UInput
                                            v-model="newTagState.name"
                                            :placeholder="$t('components.settings.tags.tag_name_placeholder')"
                                            autofocus
                                        />
                                    </UFormField>
                                    <UFormField name="description" :label="$t('components.settings.tags.tag_description_label')" class="mb-3">
                                        <UInput
                                            v-model="newTagState.description"
                                            :placeholder="$t('components.settings.tags.tag_description_placeholder')"
                                        />
                                    </UFormField>
                                    <UFormField name="color" :label="$t('components.settings.tags.tag_color_label')" class="mb-3">
                                        <CommonRecentColorPicker v-model="newTagState.color" />
                                    </UFormField>
                                </UForm>
                                <div class="flex flex-col gap-2">
                                    <UCheckbox
                                        v-model="newTagState.dark_fg_reverse"
                                        :label="$t('components.settings.tags.tag_dark_fg_reverse_label')"
                                    />
                                    <div class="flex gap-2">
                                        <div class="text-md">{{ $t('components.settings.tags.result') }}:</div>
                                        <UTooltip class="cursor-pointer" :text="newTagState.description || newTagState.name">
                                            <UBadge title="" :label="newTagState.name" :style="getTagStyle(newTagState)" />
                                        </UTooltip>
                                    </div>
                                </div>
                            </template>
                            <template #footer>
                                <div class="flex gap-2 justify-end">
                                    <UButton type="submit" form="createTagForm1" :disabled="!newTagState.name">{{
                                        $t('common.actions.save')
                                    }}</UButton>
                                    <UButton variant="soft" @click="groupTagToAdd = null">{{ $t('common.actions.cancel') }}</UButton>
                                </div>
                            </template>
                        </CommonModalDefault>
                    </div>
                    <div class="flex flex-col gap-2 mt-6 w-fit">
                        <div
                            v-for="tag in group.tags"
                            :key="tag.id"
                            class="px-4 py-2 text-sm flex items-center gap-4 rounded-lg"
                            :title="tag.description"
                        >
                            <CommonModalDefault
                                :open="editTagStateId === tag.id"
                                :title="$t('components.settings.tags.edit_tag')"
                                @update:open="
                                    (open) => {
                                        if (!open) editTagStateId = null
                                    }
                                "
                            >
                                <template #trigger>
                                    <UButton icon="i-lucide-edit" size="xs" color="neutral" variant="link" @click="editTag(group, tag)">
                                        {{ $t('components.settings.tags.edit_tag') }}
                                    </UButton>
                                </template>
                                <template #content>
                                    <UForm
                                        id="modifyTagForm1"
                                        :state="newTagState"
                                        :validate-on="['change', 'input']"
                                        :schema="UpdateTagSchema"
                                        @submit.prevent="onSubmitTag"
                                    >
                                        <UAlert v-if="errorStr" :description="errorStr || ''" color="error" variant="outline" class="mb-4" />
                                        <UFormField name="name" :label="$t('components.settings.tags.tag_name_label')" class="mb-3">
                                            <UInput
                                                v-model="newTagState.name"
                                                :placeholder="$t('components.settings.tags.tag_name_placeholder')"
                                                autofocus
                                            />
                                        </UFormField>
                                        <UFormField name="description" :label="$t('components.settings.tags.tag_description_label')" class="mb-3">
                                            <UInput
                                                v-model="newTagState.description"
                                                :placeholder="$t('components.settings.tags.tag_description_placeholder')"
                                            />
                                        </UFormField>
                                        <UFormField name="color" :label="$t('components.settings.tags.tag_color_label')" class="mb-3">
                                            <CommonRecentColorPicker v-model="newTagState.color" />
                                        </UFormField>

                                        <div class="flex flex-col gap-2">
                                            <UCheckbox
                                                v-model="newTagState.dark_fg_reverse"
                                                :label="$t('components.settings.tags.tag_dark_fg_reverse_label')"
                                            />
                                            <div class="flex gap-2">
                                                <div class="text-md">{{ $t('components.settings.tags.result') }}:</div>
                                                <UTooltip class="cursor-pointer" :text="newTagState.description || newTagState.name">
                                                    <UBadge title="" :label="newTagState.name" :style="getTagStyle(newTagState)" />
                                                </UTooltip>
                                            </div>
                                        </div>
                                    </UForm>
                                </template>
                                <template #footer>
                                    <div class="flex gap-2 justify-end">
                                        <UButton type="submit" form="modifyTagForm1" :disabled="!newTagState?.name">{{
                                            $t('common.actions.save')
                                        }}</UButton>
                                        <UButton variant="soft" @click="editTagStateId = null">{{ $t('common.actions.cancel') }}</UButton>
                                    </div>
                                </template>
                            </CommonModalDefault>

                            <CommonModalDelete :open="tagToDelete?.id === tag.id" @confirm="onDeleteTag(group, tag)" @opened="deleteAssoc = false">
                                <template #trigger>
                                    <UButton icon="i-heroicons-trash" size="xs" color="error" variant="link" @click.stop="tagToDelete = tag">
                                        {{ $t('components.settings.tags.delete_tag') }}
                                    </UButton>
                                </template>
                                <template #content>
                                    <div class="flex flex-col gap-2">
                                        <p>{{ $t('components.settings.tags.confirm_delete_tag', { name: tagToDelete?.name }) }}</p>
                                        <UCheckbox v-model="deleteAssoc" :label="$t('components.settings.tags.delete_associations')" />
                                    </div>
                                </template>
                            </CommonModalDelete>

                            <UTooltip class="cursor-pointer" :text="tag.description || tag.name" @click="editTag(group, tag)">
                                <UBadge
                                    title=""
                                    :label="tag.name"
                                    :style="{
                                        backgroundColor: tag.color != '' ? tag.color : '#333',
                                        ...(tag.dark_fg_reverse ? { color: '#fff' } : {}),
                                    }"
                                />
                            </UTooltip>
                        </div>
                    </div>
                </UCard>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

import type { TagType, CreateTagType, UpdateTagType } from '~/schema/tag'
import { CreateTagSchema, UpdateTagSchema } from '~/schema/tag'

import type { TagGroupType, CreateTagGroupType, UpdateTagGroupType } from '~/schema/tagGroup'
import { CreateTagGroupSchema, UpdateTagGroupSchema } from '~/schema/tagGroup'

const { t } = useI18n()

const userStore = useUserStore()

const { getTagStyle, fetchGroups, createGroup, updateGroup, deleteGroup, createTag, updateTag, deleteTag, tagGroups } = useTags()

const { log_error } = useLogView()

const errorStr = ref<string | null>(null)
const successStr = ref<string | null>(null)
const deleteAssoc = ref<boolean>(false)

const displayMessage = (success: string | null, error: string | null) => {
    successStr.value = success || null
    errorStr.value = error || null
    if (error) log_error(error)
}

const getDefaultTagGroup = () => ({ name: '' })
const getDefaultTag = () => ({ name: '', color: undefined, dark_fg_reverse: false, description: '' })

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
    userStore.recentColors = [color, ...userStore.recentColors.filter((c) => c !== color)].slice(0, 10)
}

function newGroup() {
    displayMessage(null, null)
    deleteAssoc.value = false
    editGroupStateId.value = null
    newGroupState.value = getDefaultTagGroup()
    showAddGroup.value = true
}

function editGroup(group: TagGroupType) {
    displayMessage(null, null)
    deleteAssoc.value = false
    editGroupStateId.value = group.id
    newGroupState.value = { ...group }
}

async function onSubmitGroup(event: FormSubmitEvent<CreateTagGroupType | UpdateTagGroupType>) {
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
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        displayMessage(null, message)
        log_error(message)
    }
}

async function onDeleteGroup(group: TagGroupType) {
    try {
        await deleteGroup(group.id, deleteAssoc.value)
        await fetchGroups()
        displayMessage(t('components.settings.tags.group_deleted'), null)
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        displayMessage(null, message)
        log_error(message)
    }
}

onMounted(async () => {
    await fetchGroups()
})

// ---------------------------------------------
// CRUD Tags
// ---------------------------------------------

function newAddTag(group: TagGroupType) {
    displayMessage(null, null)
    deleteAssoc.value = false
    editSaveGroupStateId.value = group.id
    newTagState.value = getDefaultTag()
    groupTagToAdd.value = group
}

function editTag(group: TagGroupType, tag: TagType) {
    displayMessage(null, null)
    deleteAssoc.value = false
    editSaveGroupStateId.value = group.id
    editTagStateId.value = tag.id
    newTagState.value = { ...tag }
}

async function onSubmitTag(event: FormSubmitEvent<CreateTagType | UpdateTagType>) {
    try {
        if (editTagStateId.value) {
            await updateTag(editSaveGroupStateId.value!, editTagStateId.value, event.data as UpdateTagType)
            if (event.data.color) {
                onColorPicked(event.data.color)
            }
            displayMessage(t('components.settings.tags.tag_updated'), null)
            await fetchGroups()
            editTagStateId.value = null
        } else {
            await createTag(editSaveGroupStateId.value!, event.data as CreateTagType)
            if (event.data.color) {
                onColorPicked(event.data.color)
            }
            displayMessage(t('components.settings.tags.tag_created'), null)
            await fetchGroups()
            groupTagToAdd.value = null
        }
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        displayMessage(null, message)
        log_error(message)
    }
}

async function onDeleteTag(group: TagGroupType, tag: TagType) {
    try {
        await deleteTag(group.id, tag.id, deleteAssoc.value)
        await fetchGroups()
        displayMessage(t('components.settings.tags.tag_deleted'), null)
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        displayMessage(null, message)
        log_error(message)
    }
}
</script>
