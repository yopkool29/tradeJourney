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
                ref="formRef"
                id="createSymbolFormQuick"
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
                            :placeholder="$t('components.settings.tradingSymbols.digit_placeholder')"
                        />
                    </UFormField>
                    <UFormField name="pricePerPoint" :label="$t('components.settings.tradingSymbols.price_per_point_label')">
                        <UInput
                            v-model="newSymbolState.pricePerPoint"
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
                    <UFormField name="aliases" :label="$t('components.settings.tradingSymbols.aliases_label')">
                        <UInput
                            v-model="newSymbolState.aliases"
                            class="md:w-2/3"
                            :placeholder="$t('components.settings.tradingSymbols.aliases_placeholder')"
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
import type { CreateSymbolType, SymbolType } from '~/schema/symbol'

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
const formRef = ref<any>(null)

const getDefaultSymbol = () => ({ 
    symbol: '', 
    digit: 2, 
    notes: null, 
    aliases: '', 
    active: true, 
    userId: 0 
})

const newSymbolState = ref<Partial<SymbolType>>(getDefaultSymbol())

const { createSymbol, updateSymbol, fetchSymbols } = useSymbols()

// Fonction pour déclencher la soumission du formulaire
const handleSubmit = async () => {
    if (formRef.value) {
        await formRef.value.submit()
    }
}

const submitSymbol = async (event: FormSubmitEvent<CreateSymbolType>) => {
    try {
        if (props.symbol?.id) {
            // Mode édition
            const updatedSymbol = await updateSymbol({ ...event.data, id: props.symbol.id })
            await fetchSymbols()
            emit('updated', updatedSymbol)
        } else {
            // Mode création
            const createdSymbol = await createSymbol(event.data)
            await fetchSymbols()
            emit('created', createdSymbol)
        }
        
        // Réinitialiser et fermer
        newSymbolState.value = getDefaultSymbol()
        isOpen.value = false
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        isOpen.value = false
        emit('error', message)
        log_error(message)
    }
}

// Initialiser le formulaire quand on ouvre le modal
watch(isOpen, (newValue) => {
    if (newValue) {
        if (props.symbol) {
            // Mode édition : charger les données du symbole
            newSymbolState.value = { ...props.symbol }
        } else {
            // Mode création : formulaire vide
            newSymbolState.value = getDefaultSymbol()
        }
    }
})
</script>
