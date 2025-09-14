<template>
    <UModal
        v-if="!isLoading"
        :open="isOpen"
        :title="modalTitle"
        :description="$t('components.trade.tagModal.description')"
        :ui="{ content: 'sm:max-w-2xl' }"
        @update:open="(open: boolean) => $emit('update:open', open)"
    >
        <template #body>
            <UForm id="form1" :state="newState" :schema="NoteTagIdsSchema" :validate-on="['change', 'input']" @submit="onSubmit" @error="onError">
                <UAlert v-if="errorStr" :description="errorStr" color="error" variant="outline" class="mb-4" />

                <!-- Note pour le trade -->
                <UFormField name="note" :label="$t('components.trade.tagModal.note.label')" class="mb-4">
                    <CommonInputMenu
                        v-model="newState.note"
                        name="note2"
                        :placeholder="$t('components.trade.tagModal.note.placeholder')"
                        :position="'top'"
                        :when="'always'"
                        width="full"
                        size="md"
                        autofocus
                    />
                </UFormField>

                <!-- Sélection de tags avec le composant réutilisable -->
                <CommonTagSelector v-model="newState.tagIds" :tag-groups="tagGroups" field-name="tagIds" />

                <div class="mt-6 p-4 border rounded-md border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <UFormField :label="$t('components.trade.tagModal.screenshots')" name="screenshots" class="text-base">
                        <ScreenshotManager v-model="screenshots" :max-screenshots="3" :max-image-width="144" :max-image-height="96" />
                    </UFormField>
                </div>
            </UForm>
        </template>
        <template #footer>
            <div class="flex gap-2 justify-end">
                <UButton form="form1" type="submit" :loading="isLoading">{{
                    trade ? $t('components.trade.tagModal.buttons.update') : $t('common.actions.save')
                }}</UButton>
                <UButton type="button" variant="soft" @click="$emit('update:open', false)">{{
                    $t('common.actions.cancel')
                }}</UButton>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
import type { TagGroupType } from '~/schema/tagGroup'
import type { TradeType, NoteTagIdsType, UpdateTradeType } from '~/schema/trade'
import { NoteTagIdsSchema } from '~/schema/trade'
import type { FormErrorEvent, FormSubmitEvent } from '@nuxt/ui'

// Récupérer les tags et groupes de tags
const { fetchGroups } = useTags()
const { updateTradeTags } = useTradeTags()
const { fetchTrade } = useTrades()
const { log_error } = useLogView()
const { t } = useI18n()

const props = defineProps<{
    isOpen: boolean
    trade: TradeType
}>()

const modalTitle = computed(() =>
    props.trade ? t('components.trade.tagModal.titleWithSymbol', { symbol: props.trade.symbol }) : t('components.trade.tagModal.title')
)

const errorStr = ref('')
const isLoading = ref(false)

const getDefault = (): NoteTagIdsType => ({ idTrade: -1, note: '', tagIds: [] })
const newState = ref(getDefault())
const tagGroups = ref<TagGroupType[]>([])

const { screenshots, initializeScreenshots, prepareForUpdate, uploadNewScreenshots, cleanup } = useSharedScreenshots(3)

function initializeScreenshotsFrom(trade: TradeType) {
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
    errorStr.value = ''

    const trade = await fetchTrade(props.trade.id)
    if (!trade) {
        log_error(t('components.trade.tagModal.errors.tradeNotFound', { id: props.trade.id }))
        return
    }

    newState.value = {
        ...getDefault(),
        idTrade: trade.id,
        note: trade.note || '',
        tagIds: trade.tags.map((t) => t.id),
    }

    initializeScreenshotsFrom(trade!)
}

function onError(event: FormErrorEvent) {
    errorStr.value = t('components.trade.tagModal.errors.form')
    const val = event?.errors?.[0]
    if (val) {
        if (val.id) {
            const element = document.getElementById(val.id)
            element?.focus()
        } else {
            errorStr.value = t('components.trade.tagModal.errors.specific', { message: val.message, name: val.name })
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

        if (props.trade.note !== event.data.note) {
            update.note = event.data.note
        }

        update.screenshots = prepareForUpdate()

        const saved = await updateTrade(update)

        await uploadNewScreenshots(saved.id)

        cleanup()

        // Mettre à jour les tags du trade
        await updateTradeTags(event.data.idTrade, {
            tagIds: event.data.tagIds,
        })

        // Fermer la modal et émettre l'événement updated
        emit('saved', event.data.note, event.data.tagIds)
        emit('update:open', false)
    } catch (error) {
        errorStr.value = error instanceof Error ? error.message : t('components.trade.tagModal.errors.generic')
    } finally {
        isLoading.value = false
    }
}

// Initialiser les données quand la modal s'ouvre
watch(
    () => props.isOpen,
    async (isOpen: boolean) => {
        isLoading.value = true
        if (isOpen) {
            await initializeData()
            isLoading.value = false
        }
    }
)

const emit = defineEmits<{
    'update:open': [value: boolean]
    saved: [note: string, idTags: number[]]
}>()
</script>
