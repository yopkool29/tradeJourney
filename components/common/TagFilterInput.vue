<template>
    <div>
        <!-- Tags sélectionnés affichés comme badges -->
        <div v-if="selectedTags.length > 0" class="flex flex-wrap items-center gap-2">
            <UTooltip v-for="tag in selectedTags" :key="tag.id" :text="tag.description || tag.name">
                <UBadge
                    class="cursor-pointer"
                    size="md"
                    :label="tag.name"
                    :style="getTagStyle(tag)"
                    @click="openModal"
                >
                    {{ tag.name }}
                    <UIcon name="i-heroicons-x-mark" class="ml-1" @click.stop="removeTag(tag.id)" />
                </UBadge>
            </UTooltip>
        </div>

        <!-- Bouton pour ouvrir la modal de sélection -->
        <UButton
            v-else
            icon="i-lucide-tag"
            variant="outline"
            size="sm"
            color="neutral"
            @click="openModal"
        >
            {{ $t('components.trade.table.tagSelector.select_tags') }}
        </UButton>

        <!-- Modal de sélection de tags -->
        <CommonModalDefault v-model:open="isOpen" :title="$t('components.trade.table.tagSelector.select_tags')">
            <template #content>
                <div class="p-4">
                    <CommonTagSelector
                        v-model="tempSelectedIds"
                        :tag-groups="localTagGroups"
                        :show-manage-button="false"
                    />
                </div>
            </template>
            <template #footer>
                <div class="action-buttons-end">
                    <UButton @click="confirmSelection">{{ $t('common.actions.validate') }}</UButton>
                    <UButton variant="soft" @click="cancelSelection">{{ $t('common.actions.cancel') }}</UButton>
                </div>
            </template>
        </CommonModalDefault>
    </div>
</template>

<script setup lang="ts">
import type { z } from 'zod'
import type { TagGroupType } from '~/schema/tagGroup'
import type { TagSchema } from '~/schema/tag'

type TagType = z.infer<typeof TagSchema>

const { getTagStyle } = useTags()

const modelValue = defineModel<number | string>('modelValue', { required: true })

const props = withDefaults(
    defineProps<{
        tagGroups: TagGroupType[]
    }>(),
    {}
)

const isOpen = ref(false)
const tempSelectedIds = ref<number[]>([])
const localTagGroups = ref<TagGroupType[]>(props.tagGroups)

watch(() => props.tagGroups, (val) => {
    localTagGroups.value = val
})

// Ouvrir la modal - copier la sélection actuelle
const openModal = () => {
    tempSelectedIds.value = [...selectedTagIds.value]
    isOpen.value = true
}

// Limiter à 3 tags maximum
watch(tempSelectedIds, (newIds) => {
    if (newIds.length > 3) {
        tempSelectedIds.value = newIds.slice(0, 3)
    }
}, { deep: true })

// Tags sélectionnés (tableau d'IDs)
const selectedTagIds = computed<number[]>(() => {
    if (typeof modelValue.value === 'string') {
        if (!modelValue.value) return []
        return modelValue.value.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
    }
    return modelValue.value ? [modelValue.value] : []
})

// Tags sélectionnés (objets complets)
const selectedTags = computed<TagType[]>(() => {
    const tags: TagType[] = []
    for (const group of localTagGroups.value) {
        for (const tag of group.tags) {
            if (selectedTagIds.value.includes(tag.id)) {
                tags.push(tag)
            }
        }
    }
    return tags
})

// Vérifier si un tag est sélectionné
const isTagSelected = (tagId: number) => {
    return selectedTagIds.value.includes(tagId)
}

// Toggle un tag (ajouter ou retirer)
const toggleTag = (tag: TagType) => {
    const currentIds = [...selectedTagIds.value]
    const index = currentIds.indexOf(tag.id)
    if (index > -1) {
        currentIds.splice(index, 1)
    } else {
        if (currentIds.length < 3) {
            currentIds.push(tag.id)
        }
    }
    modelValue.value = currentIds.join(',')
}

// Retirer un tag
const removeTag = (tagId: number) => {
    const currentIds = selectedTagIds.value.filter(id => id !== tagId)
    modelValue.value = currentIds.join(',')
}

// Confirmer la sélection et appliquer
const confirmSelection = () => {
    modelValue.value = tempSelectedIds.value.join(',')
    isOpen.value = false
}

// Annuler la sélection
const cancelSelection = () => {
    tempSelectedIds.value = []
    isOpen.value = false
}
</script>
