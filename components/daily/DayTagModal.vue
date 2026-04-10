<template>
    <UModal :open="isOpen" :title="modalTitle" @update:open="(open: boolean) => $emit('update:open', open)">
        <template #body>
            <UForm id="form1" :state="newState" :schema="CreateDayTagSchema" :validate-on="['change', 'input']" @submit="onSubmit" @error="onError">
                <CommonAlertBox :success-str="successStr" :error-str="errorStr" />

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
            <div class="flex justify-end gap-4 mt-6">
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
import { CreateDayTagSchema } from '~/schema/dayTag'
import type { FormSubmitEvent, FormErrorEvent } from '@nuxt/ui'
import { normalizeDateToLocalString } from '~/utils/date-utils'

const { t } = useI18n()
const { success: toastSuccess, error: toastError } = useAppToast()
const { errorStr, successStr, displayMessage } = useAlert()

const { fetchGroups } = useTags()
const { createDayTag, updateDayTag } = useDayTags()

const props = defineProps<{
    isOpen: boolean
    date: Date | string
    dayTag: DayTagType | null
}>()

const modalTitle = computed(() => (props.dayTag ? t('components.daily.day_tag_modal.edit_title') : t('components.daily.day_tag_modal.add_title')))

const getDefault = () => ({ id: -1, date: '', note: '', tagIds: [] as number[] })
const newState = ref<CreateDayTagType>(getDefault())
const tagGroups = ref<TagGroupType[]>([])

// Les tags sélectionnés sont maintenant gérés par le composant TagSelector

// Initialiser les données
const initializeData = async () => {
    tagGroups.value = await fetchGroups()
    displayMessage(null, null)
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

const onError = (event: FormErrorEvent) => {
    const errorMessage = t('components.daily.day_tag_modal.error_form')
    displayMessage(null, errorMessage)
    // Focus sur le premier champ avec erreur
    const val = event?.errors?.[0]
    if (val) {
        if (val.id) {
            const element = document.getElementById(val.id)
            element?.focus()
        } else {
            const fieldError = t('components.daily.day_tag_modal.error_field', { message: val.message, name: val.name })
            displayMessage(null, fieldError)
        }
    }
}

// Soumettre le formulaire
const onSubmit = async (event: FormSubmitEvent<CreateDayTagType | UpdateDayTagType>) => {
    if (!props.date) return
    try {
        let result
        // Normaliser la date en format YYYY-MM-DD pour éviter les problèmes de timezone
        const normalizedDate = typeof props.date === 'string' 
            ? props.date 
            : normalizeDateToLocalString(props.date)
        
        if (props.dayTag) {
            result = await updateDayTag({ ...event.data, id: props.dayTag.id } as UpdateDayTagType)
            const msg = t('components.daily.day_tag_modal.success_updated')
            displayMessage(msg, null)
        } else {
            result = await createDayTag({ ...event.data, date: normalizedDate } as CreateDayTagType)
            const msg = t('components.daily.day_tag_modal.success_created')
            displayMessage(msg, null)
        }
        emit('saved', result)
        emit('update:open', false)
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        displayMessage(null, message)
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
