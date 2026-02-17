<template>
    <div>
        <!-- Sélection de tags -->
        <UFormField :name="props.fieldName" label="Tags" class="mb-4">
            <!-- Tags sélectionnés -->
            <div class="flex flex-wrap gap-2 mb-2">
                <UTooltip v-for="tag in selectedTags" :key="tag.id" :text="tag.description || tag.name">
                    <UBadge
                        class="cursor-pointer"
                        title=""
                        :label="tag.name"
                        :style="getTagStyle(tag)"
                        @click="removeTag(tag.id)"
                    >
                        {{ tag.name }}
                        <UIcon name="i-heroicons-x-mark" class="ml-1" />
                    </UBadge>
                </UTooltip>
            </div>

            <!-- Liste des groupes de tags disponibles -->
            <div v-if="tagGroups.length > 0" class="border rounded-md p-2 max-h-64 overflow-y-auto">
                <div v-for="group in tagGroups" :key="group.id" class="mb-3">
                    <div class="font-semibold mb-1">{{ group.name }}</div>
                    <div class="flex flex-wrap gap-1">
                        <UTooltip v-for="tag in group.tags" :key="tag.id" :text="tag.description || tag.name">
                            <UBadge
                                class="cursor-pointer"
                                title=""
                                :label="tag.name"
                                :style="getTagStyle(tag)"
                                @click="addTag(tag)"
                            />
                        </UTooltip>
                    </div>
                </div>
            </div>
            <div v-else class="text-gray-500 text-sm">Aucun groupe / tag disponible (Allez dans paramètres pour configurer)</div>
        </UFormField>
    </div>
</template>

<script setup lang="ts">
import type { z } from 'zod'
import { useTags } from '~/composables/useTags'
import type { TagGroupType } from '~/schema/tagGroup'
import type { TagSchema } from '~/schema/tag'

type TagType = z.infer<typeof TagSchema>

const { getTagStyle } = useTags()

const modelValue = defineModel<number[]>('modelValue', { required: true })

const props = withDefaults(
    defineProps<{
        tagGroups: TagGroupType[] // Groupes de tags disponibles
        fieldName?: string // Nom du champ pour UFormField
    }>(),
    {
        fieldName: 'tagIds',
    }
)

const emit = defineEmits<{
    'tag-added': [tag: TagType]
    'tag-removed': [tagId: number]
}>()

// Tags sélectionnés (calculés à partir des IDs)
const selectedTags = computed<TagType[]>(() => {
    const result: TagType[] = []
    props.tagGroups.forEach((group: TagGroupType) => {
        group.tags.forEach((tag: TagType) => {
            if (modelValue.value.includes(tag.id)) {
                result.push(tag)
            }
        })
    })
    return result
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
