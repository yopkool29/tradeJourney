<template>
    <UModal
        v-if="!isLoading"
        v-model:open="open"
        :dismissible="true"
        :title="$t('components.trade.formModal.title')"
        :ui="{ content: 'sm:max-w-6xl' }"
    >
        <template #body>
            <div class="p-4">
                <h3 class="modal-title">
                    {{ props.trade ? $t('components.trade.formModal.edit_trade') : $t('components.trade.formModal.add_trade') }}
                </h3>
                <p class="text-muted mb-6">{{ $t('components.trade.formModal.instructions') }}</p>
                <UForm class="space-y-5" :schema="CreateTradeSchema" :state="newState" @submit="onSubmit" @error="onError">
                    <div class="flex space-x-3 my-6">
                        <UButton type="submit" :loading="isLoading" color="primary">{{ $t('common.actions.save') }}</UButton>
                        <UButton type="button" color="neutral" @click="$emit('update:open', false)">{{ $t('common.actions.cancel') }}</UButton>
                    </div>
                    <CommonAlertBox :success-str="successStr" :error-str="errorStr" />
                    <div class="flex">
                        <UFormField
                            :label="$t('components.trade.formModal.account.label')"
                            name="accountId"
                            :help="$t('components.trade.formModal.account.help')"
                            class="text-base"
                        >
                            <USelect
                                v-model="newState.accountId"
                                :items="accounts.map((item) => ({ value: item.id, label: item.displayName }))"
                                :placeholder="$t('components.trade.formModal.account.placeholder')"
                                size="lg"
                                class="min-w-[200px]"
                            />
                        </UFormField>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            :error="availableSymbols.length === 0 ? $t('components.trade.formModal.symbol.no_symbols_error') : ''"
                        >
                            <div class="flex gap-2 items-center">
                                <USelect
                                    v-model="newState.symbol"
                                    :items="availableSymbols.map((s) => s.symbol)"
                                    :placeholder="$t('components.trade.formModal.symbol.placeholder')"
                                    searchable
                                    size="lg"
                                    class="min-w-[200px] flex-1"
                                />
                                <SymbolCreateModal @created="onSymbolCreated" @error="onSymbolError">
                                    <template #trigger>
                                        <UButton
                                            icon="i-lucide-plus-circle"
                                            color="primary"
                                            variant="soft"
                                            size="lg"
                                            :title="$t('components.settings.tradingSymbols.new_symbol')"
                                        />
                                    </template>
                                </SymbolCreateModal>
                            </div>
                            <div class="field-help-text">{{ $t('components.trade.formModal.symbol.help') }}</div>
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.type.label')" name="type" class="text-base">
                            <USelect
                                v-model="newState.type"
                                :items="[
                                    { value: 'buy', label: $t('components.trade.formModal.type.buy') },
                                    { value: 'sell', label: $t('components.trade.formModal.type.sell') },
                                ]"
                                type="radio"
                                class="space-y-2"
                            />
                            <div class="field-help-text">{{ $t('components.trade.formModal.type.help') }}</div>
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.instrumentType.label')" name="instrumentType" class="text-base">
                            <USelect
                                v-model="newState.instrumentType"
                                :items="INSTRUMENT_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))"
                                class="min-w-[150px]"
                            />
                            <div class="field-help-text">{{ $t('components.trade.formModal.instrumentType.help') }}</div>
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.openPrice.label')" name="openPrice" class="text-base">
                            <UInput
                                v-model="newState.openPrice"
                                :step="step"
                                type="number"
                                :placeholder="$t('components.trade.formModal.openPrice.placeholder')"
                                size="lg"
                            />
                            <div class="field-help-text">{{ $t('components.trade.formModal.openPrice.help') }}</div>
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.closePrice.label')" name="closePrice" class="text-base">
                            <UInput
                                v-model="newState.closePrice"
                                :step="step"
                                type="number"
                                :placeholder="$t('components.trade.formModal.closePrice.placeholder')"
                                size="lg"
                            />
                            <div class="field-help-text">{{ $t('components.trade.formModal.closePrice.help') }}</div>
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.lot.label')" name="lot" class="text-base">
                            <UInput
                                v-model="newState.lot"
                                type="number"
                                step="0.01"
                                :placeholder="$t('components.trade.formModal.lot.placeholder')"
                                size="lg"
                            />
                            <div class="field-help-text">{{ $t('components.trade.formModal.lot.help') }}</div>
                        </UFormField>
                        <UFormField
                            :label="$t('components.trade.formModal.profit.label')"
                            name="profit"
                            :help="$t('components.trade.formModal.profit.help')"
                            class="text-base"
                        >
                            <UInput
                                v-model="newState.profit"
                                type="number"
                                step="0.01"
                                :placeholder="$t('components.trade.formModal.profit.placeholder')"
                                size="lg"
                            />
                            <div class="field-help-text">{{ $t('components.trade.formModal.profit.subhelp') }}</div>
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.stopLoss.label')" name="stopLoss" class="text-base">
                            <UInput
                                v-model="newState.stopLoss"
                                :step="step"
                                type="number"
                                :placeholder="$t('components.trade.formModal.stopLoss.placeholder')"
                                size="lg"
                            />
                            <div class="field-help-text">{{ $t('components.trade.formModal.stopLoss.help') }}</div>
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.takeProfit.label')" name="takeProfit" class="text-base">
                            <UInput
                                v-model="newState.takeProfit"
                                :step="step"
                                type="number"
                                :placeholder="$t('components.trade.formModal.takeProfit.placeholder')"
                                size="lg"
                            />
                            <div class="field-help-text">{{ $t('components.trade.formModal.takeProfit.help') }}</div>
                        </UFormField>
                        <UFormField :label="$t('components.trade.formModal.riskReward.label')" name="riskReward" class="text-base">
                            <div class="flex gap-1 items-center">
                                <UInput
                                    v-model="newState.riskReward"
                                    type="number"
                                    step="0.01"
                                    max="500"
                                    :placeholder="$t('components.trade.formModal.riskReward.placeholder')"
                                    size="lg"
                                    class="w-24"
                                    :class="isRiskRewardNegative ? 'ring-2 ring-red-500 dark:ring-red-400' : ''"
                                />
                                <UButton
                                    icon="i-lucide-calculator"
                                    color="neutral"
                                    variant="soft"
                                    size="xs"
                                    :disabled="!canCalculateRR"
                                    :title="$t('components.trade.formModal.riskReward.calc_button')"
                                    @click="calculateRR"
                                />
                                <UButton
                                    icon="i-lucide-trash-2"
                                    color="neutral"
                                    variant="soft"
                                    size="xs"
                                    :disabled="!newState.riskReward"
                                    :title="$t('components.trade.formModal.riskReward.clear_button')"
                                    @click="clearRR"
                                />
                            </div>
                            <div class="field-help-text">{{ $t('components.trade.formModal.riskReward.help') }}</div>
                        </UFormField>
                    </div>
                    <div class="screenshot-container">
                        <UFormField :label="$t('components.trade.formModal.screenshots.label')" name="screenshots" class="text-base">
                            <ScreenshotManager v-model="screenshots" :max-image-width="320" :max-image-height="96" />
                        </UFormField>
                    </div>
                </UForm>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
import { INSTRUMENT_TYPES } from '~/schema/importProfile'
import type { TradeType } from '~/schema/trade'
import { useTradeForm } from '~/composables/trades/useTradeForm'

const emit = defineEmits<{
    saved: []
}>()

const open = defineModel<boolean>('open', { required: true })

const props = defineProps({
    trade: {
        type: Object as () => TradeType | null,
        default: () => null,
    },
})

const {
    CreateTradeSchema,
    availableSymbols, fetchActiveSymbols,
    accounts, fetchAccounts,
    errorStr, successStr,
    isLoading,
    selectedSymbol,
    newState, screenshots,
    openDateStr, closeDateStr,
    isRiskRewardNegative, canCalculateRR, step,
    onError, newForm, editForm, onSubmit,
    calculateRR, clearRR,
    onSymbolCreated, onSymbolError,
} = useTradeForm(emit)

watch(open, async (isOpen: boolean) => {
    isLoading.value = true
    if (isOpen) {
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
                console.error('Loading error:', error)
            }
        } else {
            selectedSymbol.value = undefined
        }
    },
    { immediate: true }
)

// Synchroniser netProfit avec profit pour les trades manuels (commission = 0)
watch(
    () => newState.value.profit,
    (profit) => {
        if (newState.value.commission === 0) {
            newState.value.netProfit = profit
        }
    }
)
</script>
