<template>
    <div>
        <!-- Sélection de tags -->
        <UFormField :name="props.fieldName" label="Tags" class="mb-4">
            <!-- Tags sélectionnés -->
            <div class="flex flex-wrap gap-2 mb-2">
                <UBadge
                    v-for="tag in selectedTags"
                    :key="tag.id"
                    class="cursor-pointer"
                    :label="tag.name"
                    :style="getTagStyle(tag)"
                    :title="tag.description || tag.name"
                    @click="removeTag(tag.id)"
                >
                    {{ tag.name }}
                    <UIcon name="i-heroicons-x-mark" class="ml-1" />
                </UBadge>
            </div>

            <!-- Liste des groupes de tags disponibles -->
            <div v-if="localTagGroups.length > 0" class="border rounded-md p-2 max-h-64 overflow-y-auto">
                <div v-for="group in sortedTagGroups" :key="group.id" class="mb-3">
                    <div class="font-semibold mb-1">{{ group.name }}</div>
                    <div class="flex flex-wrap gap-1">
                        <UBadge
                            v-for="tag in group.tags"
                            :key="tag.id"
                            class="cursor-pointer"
                            :label="tag.name"
                            :style="getTagStyle(tag)"
                            :title="tag.description || tag.name"
                            @click="addTag(tag)"
                        />
                    </div>
                </div>
            </div>
            <div v-else class="text-gray-500 text-sm">Aucun groupe / tag disponible (Allez dans paramètres pour configurer)</div>
            <div v-if="props.showManageButton" class="mt-2">
                <UButton icon="i-lucide-settings" size="xs" color="neutral" variant="ghost" @click="openTagsManager">{{ $t('components.common.tagSelector.manage_tags') }}</UButton>
            </div>
        </UFormField>
    </div>
</template>

<script setup lang="ts">
import type { z } from 'zod'
import type { TagGroupType } from '~/schema/tagGroup'
import type { TagSchema } from '~/schema/tag'

type TagType = z.infer<typeof TagSchema>

const { getTagStyle, fetchGroups, tagGroups: fetchedTagGroups } = useTags()
const overlay = useOverlay()

const modelValue = defineModel<number[]>('modelValue', { required: true })

const props = withDefaults(
    defineProps<{
        tagGroups: TagGroupType[]
        fieldName?: string
        showManageButton?: boolean
    }>(),
    {
        fieldName: 'tagIds',
        showManageButton: true,
    }
)

const localTagGroups = ref<TagGroupType[]>(props.tagGroups)

const sortedTagGroups = computed<TagGroupType[]>(() => {
    return localTagGroups.value.map(group => ({
        ...group,
        tags: [...group.tags].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    }))
})

watch(() => props.tagGroups, (val) => {
    localTagGroups.value = val
})

const openTagsManager = async () => {
    const modalComponent = resolveComponent('LazyCommonTagsManagerModal')
    const modal = overlay.create(modalComponent as Component)
    await modal.open()
    await onTagsUpdated()
}

const onTagsUpdated = async () => {
    await fetchGroups()
    localTagGroups.value = fetchedTagGroups.value
}

const emit = defineEmits<{
    'tag-added': [tag: TagType]
    'tag-removed': [tagId: number]
}>()

// Tags sélectionnés (dans l'ordre d'insertion de l'utilisateur)
const selectedTags = computed<TagType[]>(() => {
    return modelValue.value.map(id => {
        for (const group of localTagGroups.value) {
            const tag = group.tags.find((t: TagType) => t.id === id)
            if (tag) return tag
        }
        return null
    }).filter((tag): tag is TagType => tag !== null)
})

// Ajouter un tag
const addTag = (tag: TagType) => {
    if (!modelValue.value.includes(tag.id)) {
        modelValue.value = [...modelValue.value, tag.id]
        emit('tag-added', tag)
    }
}

// Supprimer un tag
const removeTag = (tagId: number) => {
    modelValue.value = modelValue.value.filter((id) => id !== tagId)
    emit('tag-removed', tagId)
}
</script>
