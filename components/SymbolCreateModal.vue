<template>
    <CommonModalDefault
        v-model:open="isOpen"
        :title="props.symbol ? $t('components.settings.tradingSymbols.edit_symbol_modal') : $t('components.settings.tradingSymbols.add_symbol_modal')"
    >
        <template #trigger>
            <slot name="trigger">
                <UButton icon="i-lucide-plus" size="xs">
                    {{ $t('components.settings.tradingSymbols.new_symbol') }}
                </UButton>
            </slot>
        </template>
        <template #content>
            <UForm
                id="createSymbolFormQuick"
                ref="formRef"
                :state="newSymbolState"
                :schema="CreateSymbolSchema"
                :validate-on="['change', 'input']"
                @submit="submitSymbol"
            >
                <div class="form-fields-container">
                    <UFormField name="symbol" :label="$t('components.settings.tradingSymbols.symbol_label')" required>
                        <UInput
                            v-model="newSymbolState.symbol"
                            :placeholder="$t('components.settings.tradingSymbols.symbol_placeholder')"
                            autofocus
                        />
                    </UFormField>
                    <UFormField name="digit" :label="$t('components.settings.tradingSymbols.digit_label')">
                        <UInput
                            v-model="newSymbolState.digit"
                            class="w-32"
                            type="number"
                            min="0"
                            max="6"
                            :placeholder="$t('components.settings.tradingSymbols.digit_placeholder')"
                        />
                    </UFormField>
                    <UFormField name="pricePerPoint" :label="$t('components.settings.tradingSymbols.price_per_point_label')">
                        <UInput
                            v-model="newSymbolState.pricePerPoint"
                            class="w-32"
                            type="number"
                            step="0.01"
                            :placeholder="$t('components.settings.tradingSymbols.price_per_point_placeholder')"
                        />
                    </UFormField>
                    <UFormField name="notes" :label="$t('components.settings.tradingSymbols.notes_label')">
                        <UInput
                            v-model="newSymbolState.notes"
                            class="md:w-2/3"
                            :placeholder="$t('components.settings.tradingSymbols.notes_placeholder')"
                        />
                    </UFormField>
                    <UFormField name="customFields" :label="$t('components.common.customFields.label')">
                        <CommonCustomFields
                            v-model="customFields"
                            first-field-key="aliases"
                        />
                    </UFormField>
                </div>
            </UForm>
        </template>
        <template #footer>
            <div class="action-buttons-end">
                <UButton type="submit" form="createSymbolFormQuick" color="primary">
                    {{ $t('common.actions.save') }}
                </UButton>
                <UButton type="button" color="neutral" variant="soft" @click.prevent="isOpen = false">
                    {{ $t('common.actions.cancel') }}
                </UButton>
            </div>
        </template>
    </CommonModalDefault>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { CreateSymbolSchema } from '~/schema/symbol'
import type { CreateSymbolType, SymbolType, CustomField } from '~/schema/symbol'

const { t } = useI18n()
const { log_error } = useLogView()
const { success: toastSuccess, error: toastError } = useAppToast()

const props = defineProps<{
    symbol?: SymbolType | null
}>()

const emit = defineEmits<{
    created: [symbol: SymbolType]
    updated: [symbol: SymbolType]
    error: [error: string | null]
}>()

const isOpen = ref(false)
type FormRef = { submit: () => Promise<void> | void }
const formRef = ref<FormRef | null>(null)

const getDefaultSymbol = () => ({ 
    symbol: '', 
    digit: 2, 
    notes: null, 
    aliases: '', 
    active: true, 
    userId: 0 
})

const newSymbolState = ref<Partial<SymbolType>>(getDefaultSymbol())

const customFields = ref<CustomField[]>([{ key: 'aliases', value: '' }])

const customFieldsHasErrors = computed(() => {
    const allKeys = customFields.value.map(f => f.key.trim().toLowerCase()).filter(k => k)
    const hasDuplicates = allKeys.length !== new Set(allKeys).size
    const freeFields = customFields.value.slice(1)
    const hasEmptyKeys = freeFields.some(f => !f.key.trim())
    return hasDuplicates || hasEmptyKeys
})

const { createSymbol, updateSymbol } = useSymbols()

// Initialiser customFields depuis le symbol (migration depuis aliases CSV si besoin)
const initCustomFields = (symbol: SymbolType | null | undefined) => {
    if (!symbol) {
        customFields.value = [{ key: 'aliases', value: '' }]
        return
    }
    const existing = symbol.metadata?.customFields
    if (existing && existing.length > 0) {
        // Migration : renommer l'ancienne clé 'alias' en 'aliases'
        customFields.value = existing.map(f => f.key === 'alias' ? { ...f, key: 'aliases' } : f)
    } else {
        // Migration depuis l'ancien champ aliases CSV
        customFields.value = [{ key: 'aliases', value: symbol.aliases ?? '' }]
    }
}

// Fonction pour déclencher la soumission du formulaire
const handleSubmit = async () => {
    if (formRef.value) {
        await formRef.value.submit()
    }
}

const submitSymbol = async (event: FormSubmitEvent<CreateSymbolType>) => {
    if (customFieldsHasErrors.value) return
    try {
        if (props.symbol?.id) {
            // Mode édition
            const updatedSymbol = await updateSymbol({ ...event.data, id: props.symbol.id, customFields: customFields.value })
            emit('updated', updatedSymbol)
        } else {
            // Mode création
            const createdSymbol = await createSymbol({ ...event.data, customFields: customFields.value })
            emit('created', createdSymbol)
        }
        
        // Réinitialiser et fermer
        newSymbolState.value = getDefaultSymbol()
        customFields.value = [{ key: 'aliases', value: '' }]
        isOpen.value = false
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        isOpen.value = false
        emit('error', message)
        log_error(message)
    }
}

// Initialiser/réinitialiser le formulaire à l'ouverture/fermeture du modal
watch(isOpen, (newValue) => {
    if (newValue) {
        if (props.symbol) {
            // Mode édition : charger les données du symbole
            newSymbolState.value = { ...props.symbol }
            initCustomFields(props.symbol)
        } else {
            // Mode création : formulaire vide
            newSymbolState.value = getDefaultSymbol()
            customFields.value = [{ key: 'aliases', value: '' }]
        }
    } else {
        // Fermeture (annuler ou après save) : reset propre
        newSymbolState.value = getDefaultSymbol()
        customFields.value = [{ key: 'aliases', value: '' }]
    }
})
</script>
