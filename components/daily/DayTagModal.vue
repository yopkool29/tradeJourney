<template>
    <UModal :open="isOpen" :title="modalTitle" @update:open="(open: boolean) => $emit('update:open', open)">
        <template #body>
            <UForm id="form1" :state="newState" :schema="CreateDayTagSchema" :validate-on="['change', 'input']" @submit="onSubmit" @error="onError">
                <UAlert v-if="errorStr" :description="errorStr" color="error" variant="outline" class="mb-4" />

                <!-- Note pour la journée -->
                <UFormField name="note" :label="$t('components.daily.day_tag_modal.note_label')" class="mb-4">
                    <CommonInputMenu
                        v-model="newState.note"
                        name="note"
                        :placeholder="$t('components.daily.day_tag_modal.note_placeholder')"
                        :position="'top'"
                        :when="'always'"
                        width="full"
                        size="md"
                        autofocus
                    />
                </UFormField>

                <!-- Sélection de tags avec le composant réutilisable -->
                <CommonTagSelector v-model="newState.tagIds" :tag-groups="tagGroups" field-name="tagIds" />
            </UForm>
        </template>
        <template #footer>
            <div class="flex justify-end gap-2 mt-6">
                <UButton form="form1" type="submit">{{ dayTag ? $t('components.daily.day_tag_modal.update') : $t('common.actions.save') }}</UButton>
                <UButton type="button" variant="soft" @click="$emit('update:open', false)">{{ $t('common.actions.cancel') }}</UButton>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
import type { TagGroupType } from '~/schema/tagGroup'
import type { DayTagType, CreateDayTagType, UpdateDayTagType } from '~/schema/dayTag'
import type { TagType } from '~/schema/tag'
import { useTags } from '~/composables/useTags'
import { useDayTags } from '~/composables/useDayTags'
import { CreateDayTagSchema } from '~/schema/dayTag'
import type { FormSubmitEvent, FormErrorEvent } from '@nuxt/ui'

const { t } = useI18n()

const { fetchGroups } = useTags()
const { createDayTag, updateDayTag } = useDayTags()

const props = defineProps<{
    isOpen: boolean
    date: Date | string
    dayTag: DayTagType | null
}>()

const modalTitle = computed(() => (props.dayTag ? t('components.daily.day_tag_modal.edit_title') : t('components.daily.day_tag_modal.add_title')))

const errorStr = ref<string | null>('')

const getDefault = () => ({ id: -1, date: '', note: '', tagIds: [] as number[] })
const newState = ref<CreateDayTagType>(getDefault())
const tagGroups = ref<TagGroupType[]>([])

// Les tags sélectionnés sont maintenant gérés par le composant TagSelector

// Initialiser les données
const initializeData = async () => {
    tagGroups.value = await fetchGroups()
    errorStr.value = ''
    if (props.dayTag) {
        newState.value = {
            ...props.dayTag,
            date: props.date,
            tagIds: props.dayTag.tags.map((tag: TagType) => tag.id),
        }
    } else {
        // Réinitialiser le formulaire pour une nouvelle entrée
        newState.value = getDefault()
    }
}

function onError(event: FormErrorEvent) {
    errorStr.value = t('components.daily.day_tag_modal.error_form')
    // Focus sur le premier champ avec erreur
    const val = event?.errors?.[0]
    if (val) {
        if (val.id) {
            const element = document.getElementById(val.id)
            element?.focus()
        } else {
            errorStr.value = t('components.daily.day_tag_modal.error_field', { message: val.message, name: val.name })
        }
    }
}

// Soumettre le formulaire
async function onSubmit(event: FormSubmitEvent<CreateDayTagType | UpdateDayTagType>) {
    if (!props.date) return
    try {
        let result
        if (props.dayTag) {
            result = await updateDayTag({ ...event.data, id: props.dayTag.id } as UpdateDayTagType)
        } else {
            result = await createDayTag({ ...event.data, date: props.date } as CreateDayTagType)
        }
        emit('saved', result)
        emit('update:open', false)
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        errorStr.value = message
    }
}

// Initialiser les données quand la modal s'ouvre
watch(
    () => props.isOpen,
    (isOpen: boolean) => {
        if (isOpen) {
            initializeData()
        }
    }
)

// Initialiser au montage si la modal est déjà ouverte
if (props.isOpen) {
    initializeData()
}

const emit = defineEmits<{
    'update:open': [value: boolean]
    saved: [dayTag: DayTagType]
}>()

// Exposer les méthodes pour le composant parent
defineExpose({
    initializeData,
})
</script>
