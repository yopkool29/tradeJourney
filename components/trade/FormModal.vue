<template>
    <UModal v-if="!isLoading" v-model:open="open" :dismissible="true" :title="$t('components.trade.formModal.title')" :ui="{ content: 'sm:max-w-6xl' }">
        <template #body>
            <div class="p-4">
                <h3 class="text-xl font-bold mb-6">
                    {{ props.trade ? $t('components.trade.formModal.edit_trade') : $t('components.trade.formModal.add_trade') }}
                </h3>
                <p class="text-gray-600 dark:text-gray-300 mb-6">{{ $t('components.trade.formModal.instructions') }}</p>
                <UForm class="space-y-5" :schema="CreateTradeSchema" :state="newState" @submit="onSubmit" @error="onError">
                    <div class="flex space-x-3 my-6">
                        <UButton type="submit" :loading="isLoading" color="primary">{{ $t('common.actions.save') }}</UButton>
                        <UButton type="button" color="neutral" @click="$emit('update:open', false)">{{ $t('common.actions.cancel') }}</UButton>
                    </div>
                    <UAlert v-if="errorStr" variant="outline" :description="errorStr || ''" color="error" />
                    <div class="flex">
                        <UFormField :label="$t('components.trade.formModal.account.label')" name="accountId" :help="$t('components.trade.formModal.account.help')" class="text-base">
                            <USelect
                                v-model="newState.accountId"
                                :items="accounts.map((item) => ({ value: item.id, label: item.displayName }))"
                                :placeholder="$t('components.trade.formModal.account.placeholder')"
                                size="lg"
                                class="min-w-[200px]"
                            />
                        </UFormField>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <UFormField :label="$t('components.trade.formModal.openDate.label')" name="openDate" class="text-base">
                            <UInput v-model="openDateStr" type="datetime-local" size="lg" />
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.closeDate.label')" name="closeDate" class="text-base">
                            <UInput v-model="closeDateStr" type="datetime-local" size="lg" />
                        </UFormField>
                        <UFormField
                            :label="$t('components.trade.formModal.symbol.label')"
                            name="symbol"
                            class="text-base"
                            :error="
                                availableSymbols.length === 0
                                    ? $t('components.trade.formModal.symbol.no_symbols_error')
                                    : ''
                            "
                        >
                            <div class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.trade.formModal.symbol.help') }}</div>
                            <USelect
                                v-model="newState.symbol"
                                :items="availableSymbols.map((s) => s.symbol)"
                                :placeholder="$t('components.trade.formModal.symbol.placeholder')"
                                searchable
                                size="lg"
                                class="min-w-[200px]"
                            />
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.type.label')" name="type" class="text-base">
                            <div class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.trade.formModal.type.help') }}</div>
                            <USelect
                                v-model="newState.type"
                                :items="[
                                    { value: 'buy', label: $t('components.trade.formModal.type.buy') },
                                    { value: 'sell', label: $t('components.trade.formModal.type.sell') },
                                ]"
                                type="radio"
                                class="space-y-2"
                            />
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.openPrice.label')" name="openPrice" class="text-base">
                            <div class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.trade.formModal.openPrice.help') }}</div>
                            <UInput v-model="newState.openPrice" :step="step" type="number" :placeholder="$t('components.trade.formModal.openPrice.placeholder')" size="lg" />
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.closePrice.label')" name="closePrice" class="text-base">
                            <div class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.trade.formModal.closePrice.help') }}</div>
                            <UInput v-model="newState.closePrice" :step="step" type="number" :placeholder="$t('components.trade.formModal.closePrice.placeholder')" size="lg" />
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.lot.label')" name="lot" class="text-base">
                            <div class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.trade.formModal.lot.help') }}</div>
                            <UInput v-model="newState.lot" type="number" step="0.01" :placeholder="$t('components.trade.formModal.lot.placeholder')" size="lg" />
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.profit.label')" name="profit" :help="$t('components.trade.formModal.profit.help')" class="text-base">
                            <div class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.trade.formModal.profit.subhelp') }}</div>
                            <UInput v-model="newState.profit" type="number" step="0.01" :placeholder="$t('components.trade.formModal.profit.placeholder')" size="lg" />
                        </UFormField>
                    </div>
                    <div class="mt-6 p-4 border rounded-md border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <UFormField :label="$t('components.trade.formModal.screenshots.label')" name="screenshots" class="text-base">
                            <ScreenshotManager v-model="screenshots" :max-screenshots="3" :max-image-width="320" :max-image-height="96" />
                        </UFormField>
                    </div>
                </UForm>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
import { CreateTradeSchema } from '~/schema/trade'
import type { CreateTradeType, UpdateTradeType, TradeType } from '~/schema/trade'
import type { FormSubmitEvent, FormErrorEvent } from '@nuxt/ui'

const { symbols: availableSymbols, fetchActiveSymbols } = useSymbols()
const { createTrade, updateTrade } = useTrades()
const { accounts, fetchAccounts } = useAccount()
const toast = useToast()
const isLoading = ref(false)

const { t } = useI18n()

const { log_error } = useLogView()

const open = defineModel<boolean>('open', { required: true })

const props = defineProps({
    trade: {
        type: Object as () => TradeType | null,
        default: () => null,
    },
})

const errorStr = ref<string | null>(null)

const selectedSymbol = ref<{ id: number; symbol: string; digit: number }>()

const getDefaultForm = () =>
    ({
        accountId: -1,
        openDate: new Date(),
        closeDate: new Date(),
        symbol: '',
        type: 'buy',
        lot: 0,
        openPrice: 0,
        closePrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        profit: 0,
        commission: 0,
        exchange: 0,
        screenshotUrl: null,
    }) as CreateTradeType

const newState = ref<CreateTradeType>(getDefaultForm())

const { screenshots, initializeScreenshots, prepareForUpdate, uploadNewScreenshots, cleanup } = useSharedScreenshots(3)

function onError(event: FormErrorEvent) {
    errorStr.value = t('components.trade.formModal.errors.form')
    const val = event?.errors?.[0]
    if (val) {
        if (val.id) {
            const element = document.getElementById(val.id)
            element?.focus()
        } else {
            errorStr.value = t('components.trade.formModal.errors.specific', { message: val.message, name: val.name })
        }
    }
}

const openDateStr = computed({
    get: () => getDatetimeLocalNow(newState.value.openDate),
    set: (value) => {
        newState.value.openDate = value
    },
})

const closeDateStr = computed({
    get: () => getDatetimeLocalNow(newState.value.closeDate),
    set: (value) => {
        newState.value.closeDate = value
    },
})

function initializeScreenshotsFrom(trade: TradeType) {
    if (trade.screenshots && trade.screenshots.length > 0) {
        const existingScreenshotsData = trade.screenshots
            .filter((s) => s.id !== undefined)
            .map((s) => ({
                id: s.id as number,
                url: s.url,
            }))

        initializeScreenshots(existingScreenshotsData)
    } else if (trade.screenshotUrl) {
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

function newForm() {
    errorStr.value = null
    newState.value = getDefaultForm()
    // Réinitialiser les screenshots avec le composable
    initializeScreenshots([])
}

function editForm(trade: TradeType) {
    errorStr.value = null
    newState.value = { ...trade }
    initializeScreenshotsFrom(trade)
}

async function onSubmit(event: FormSubmitEvent<CreateTradeType | UpdateTradeType>) {
    isLoading.value = true

    try {
        let saved: TradeType

        if ('id' in event.data && event.data.id) {
            // Pour une mise à jour, nous incluons les screenshots existants à conserver
            // dans les données envoyées à updateTrade

            // Préparer les screenshots existants à conserver
            const existingScreenshotsToKeep = prepareForUpdate()

            // Mettre à jour les données avec les screenshots existants à conserver
            const updateData = {
                ...event.data,
                screenshots: existingScreenshotsToKeep,
            }

            saved = await updateTrade(updateData as UpdateTradeType)
            toast.add({
                title: t('components.trade.formModal.success.updated_title'),
                description: t('components.trade.formModal.success.updated_description'),
                duration: 2000,
            })
        } else {
            saved = await createTrade(event.data as CreateTradeType)
            toast.add({
                title: t('components.trade.formModal.success.created_title'),
                description: t('components.trade.formModal.success.created_description'),
                duration: 2000,
            })
        }

        // Upload des nouveaux fichiers si présents
        if (saved && saved.id) {
            // Utiliser la fonction du composable pour uploader les nouveaux screenshots
            await uploadNewScreenshots(saved.id)
        }
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        log_error(message)
    } finally {
        // Nettoyer les ressources
        cleanup()
        emit('saved')
        isLoading.value = false
    }
}

watch(open, async (isOpen: boolean) => {
    isLoading.value = true
    if (isOpen) {
        // console.log('open')
        await fetchActiveSymbols()
        await fetchAccounts()
        if (props.trade) {
            editForm(props.trade)
        } else {
            newForm()
        }
        isLoading.value = false
    }
})

watch(
    () => newState.value && newState.value.symbol,
    async (symbol) => {
        if (symbol) {
            try {
                selectedSymbol.value = availableSymbols.value.find((s) => s.symbol === symbol)
            } catch (error) {
                console.error(t('components.trade.formModal.loading_error'), error)
            }
        } else {
            selectedSymbol.value = undefined
        }
    },
    { immediate: true }
)

const step = computed(() => {
    if (selectedSymbol.value?.digit !== undefined) {
        return 1 / Math.pow(10, selectedSymbol.value.digit)
    }
    return 0.00001
})

const emit = defineEmits<{
    saved: []
}>()
</script>
