<template>
    <UModal
        :open="!!trade"
        :title="modalTitle"
        :description="$t('components.trade.tagModal.description')"
        :ui="{ overlay: 'z-[100]', content: 'z-[101] sm:max-w-2xl' }"
        @update:open="(open: boolean) => { if (!open) close() }"
    >
        <template #body>
            <UForm id="form1" :state="newState" :schema="formSchema" :validate-on="['change', 'input']" @submit="onSubmit" @error="onError">
                <CommonAlertBox :success-str="successStr" :error-str="errorStr" />

                <!-- Note pour le trade -->
                <UFormField name="note" :label="$t('components.trade.tagModal.note.label')" class="mb-4">
                    <CommonInputMenu
                        v-model="newState.note"
                        name="note2"
                        :placeholder="$t('components.trade.tagModal.note.placeholder')"
                        width="full"
                        size="md"
                    />
                </UFormField>

                <!-- Note détaillée -->
                <div class="flex gap-2 mb-4">
                    <UButton
                        icon="i-heroicons-document-text"
                        color="neutral"
                        variant="outline"
                        size="sm"
                        :label="$t('components.trade.noteEditor.label')"
                        @click="openDetailedNote"
                    />
                </div>

                <!-- Sélection de tags avec le composant réutilisable -->
                <CommonTagSelector v-model="newState.tagIds" :tag-groups="tagGroups" field-name="tagIds" />

                <div class="screenshot-container">
                    <UFormField :label="$t('components.trade.tagModal.screenshots')" name="screenshots" class="text-base">
                        <ScreenshotManager v-model="screenshots" :max-screenshots="3" :max-image-width="144" :max-image-height="96" />
                    </UFormField>
                </div>
            </UForm>
        </template>
        <template #footer>
            <div class="action-buttons-end">
                <UButton form="form1" type="submit" :loading="isLoading">{{
                    currentTrade ? $t('components.trade.tagModal.buttons.update') : $t('common.actions.save')
                }}</UButton>
                <UButton type="button" variant="soft" @click="close()">{{
                    $t('common.actions.cancel')
                }}</UButton>
            </div>
        </template>
    </UModal>

    <TradeDetailedNoteModal
        v-model:open="showDetailedNote"
        v-model:model-value="detailedNote"
        @close="onDetailedNoteClose"
    />
</template>

<script setup lang="ts">
import type { TagGroupType } from '~/schema/tagGroup'
import type { TradeType, TradeExtendedType, NoteTagIdsType, UpdateTradeType } from '~/schema/trade'
import { NoteTagIdsSchema, NoteTagIdsBaseSchema } from '~/schema/trade'
import type { FormErrorEvent, FormSubmitEvent } from '@nuxt/ui'

// Récupérer les tags et groupes de tags
const { fetchGroups } = useTags()
const { updateTradeTags } = useTradeTags()
const { fetchTrade } = useTrades()
const { log_error } = useLogView()
const { t } = useI18n()
const { success: toastSuccess } = useAppToast()
const { errorStr, successStr, displayMessage, clearMessages: clearAlertMessages } = useAlert()

const { trade, close, notifySaved } = useTradeTagModal()
const currentTrade = ref<TradeExtendedType | null>(null)

const modalTitle = computed(() =>
    currentTrade.value ? t('components.trade.tagModal.titleWithSymbol', { symbol: currentTrade.value.symbol }) : t('components.trade.tagModal.title')
)

const isLoading = ref(false)
const detailedNote = ref('')
const showDetailedNote = ref(false)
const swappingForDetailedNote = ref(false)

const openDetailedNote = () => {
    swappingForDetailedNote.value = true
    close()
    nextTick(() => { showDetailedNote.value = true })
}

const onDetailedNoteClose = () => {
    trade.value = currentTrade.value
    nextTick(() => { swappingForDetailedNote.value = false })
}

const getDefault = (): NoteTagIdsType => ({ idTrade: -1, note: '', tagIds: [] })
const newState = ref(getDefault())
const tagGroups = ref<TagGroupType[]>([])

const { screenshots, initializeScreenshots, prepareForUpdate, uploadNewScreenshots, cleanup } = useSharedScreenshots(3)

// Schema dynamique : si des screenshots existent, on n'exige pas de note ou tags
const formSchema = computed(() => {
    if (screenshots.value.length > 0) {
        return NoteTagIdsBaseSchema
    }
    return NoteTagIdsSchema
})

const initializeScreenshotsFrom = (trade: TradeType) => {
    // Préparer les screenshots existants pour le composable
    if (trade.screenshots && trade.screenshots.length > 0) {
        // Convertir les screenshots existants au format attendu
        const existingScreenshotsData = trade.screenshots
            .filter((s) => s.id !== undefined)
            .map((s) => ({
                id: s.id as number,
                url: s.url,
            }))

        // Initialiser le composable avec les screenshots existants
        initializeScreenshots(existingScreenshotsData)
    } else if (trade.screenshotUrl) {
        // Cas de compatibilité avec l'ancien format (un seul screenshotUrl)
        const existingScreenshotsData = [
            {
                id: 0, // ID fictif pour l'ancien format
                url: trade.screenshotUrl,
            },
        ]

        initializeScreenshots(existingScreenshotsData)
    } else {
        // Aucun screenshot existant
        initializeScreenshots([])
    }
}

// Initialiser les données
const initializeData = async () => {
    initializeScreenshots([])

    tagGroups.value = await fetchGroups()
    clearAlertMessages()

    const fetched = await fetchTrade(currentTrade.value!.id)
    if (!fetched) {
        log_error(t('components.trade.tagModal.errors.tradeNotFound', { id: currentTrade.value!.id }))
        return
    }

    newState.value = {
        ...getDefault(),
        idTrade: fetched.id,
        note: fetched.note || '',
        tagIds: fetched.tags.map((t) => t.id),
    }

    detailedNote.value = (fetched.metadata as Record<string, unknown>)?.detailedNote as string || ''

    initializeScreenshotsFrom(fetched)
}

function onError(event: FormErrorEvent) {
    const errorMessage = t('components.trade.tagModal.errors.form')
    displayMessage(null, errorMessage)
    const val = event?.errors?.[0]
    if (val) {
        if (val.id) {
            const element = document.getElementById(val.id)
            element?.focus()
        } else {
            const specificError = t('components.trade.tagModal.errors.specific', { message: val.message, name: val.name })
            displayMessage(null, specificError)
        }
    }
}

// Soumettre le formulaire
async function onSubmit(event: FormSubmitEvent<NoteTagIdsType>) {
    isLoading.value = true

    try {
        const { updateTrade } = useTrades()

        // Mettre à jour la note du trade si elle a changé
        const update: UpdateTradeType = { id: event.data.idTrade }

        if (currentTrade.value?.note !== event.data.note) {
            update.note = event.data.note
        }

        update.screenshots = prepareForUpdate()

        update.detailedNote = detailedNote.value

        const saved = await updateTrade(update)

        await uploadNewScreenshots(saved.id)

        cleanup()

        // Mettre à jour les tags du trade
        await updateTradeTags(event.data.idTrade, {
            tagIds: event.data.tagIds,
        })

        // Fermer la modal et émettre l'événement updated
        const msg = t('components.trade.tagModal.success.saved')
        
        toastSuccess('', msg)
        detailedNote.value = ''
        notifySaved(event.data.note, event.data.tagIds)
    } catch (error) {
        const msg = error instanceof Error ? error.message : t('components.trade.tagModal.errors.generic')
        displayMessage(null, msg)
    } finally {
        isLoading.value = false
    }
}

useFormCtrlS('form1', () => !!trade.value)

// Initialiser les données quand le trade change
watch(
    trade,
    async (newTrade) => {
        if (swappingForDetailedNote.value) return
        if (newTrade) {
            currentTrade.value = newTrade
            isLoading.value = true
            await initializeData()
            isLoading.value = false
        }
    }
)

</script>

