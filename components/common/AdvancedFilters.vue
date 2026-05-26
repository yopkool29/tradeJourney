<template>
    <div class="flex flex-row gap-x-4 items-center justify-between">

        <div class="flex flex-col gap-2">
            <div v-for="(filter, idx) in modelValue" :key="idx" class="filter-actions-nowrap">
                <div class="flex items-center gap-x-2">
                    <USelect
                        :model-value="filter.column"
                        :items="columns"
                        size="md"
                        class="w-auto select-none"
                        :ui="{ content: 'w-auto min-w-[var(--reka-select-trigger-width)]' }"
                        @update:model-value="(val) => onColumnChange(idx, val)"
                    />
                    <USelect
                        :model-value="filter.operator"
                        :items="getOperatorOptions(filter.column)"
                        class="w-auto select-none"
                        :ui="{ content: 'w-auto min-w-[var(--reka-select-trigger-width)]' }"
                        @update:model-value="(val) => onOperatorChange(idx, val)"
                    />

                    <!-- Slot spécifique pour les symboles -->
                    <CommonSymbolFilterInput
                        v-if="filter.column === 'symbol'"
                        :model-value="filter.value as string | string[]"
                        :multiple="filter.operator === OPERATOR_IN"
                        @update:model-value="(val) => { onValueChange(idx, val); debouncedApply() }"
                    />

                    <!-- Slot spécifique pour les tags (priorité sur field-type) -->
                    <CommonTagFilterInput
                        v-else-if="filter.column === 'tags'"
                        :model-value="filter.value as number"
                        :tag-groups="tagGroups || []"
                        @update:model-value="(val) => { onValueChange(idx, val); debouncedApply() }"
                    />

                    <!-- Slot spécifique pour le type (buy/sell) -->
                    <USelect
                        v-else-if="filter.column === 'type'"
                        :model-value="filter.value as string"
                        :items="typeItems"
                        placeholder="Buy/Sell"
                        class="min-w-[120px]"
                        @update:model-value="(val) => { onValueChange(idx, val); debouncedApply() }"
                    />

                    <!-- Slot pour champ personnalisé (autres colonnes) -->
                    <slot v-else :name="`field-${filter.column}`" :filter="filter" :index="idx" :on-value-change="(val: any) => { onValueChange(idx, val); debouncedApply() }">
                        <!-- Champ par défaut -->
                        <CommonFilterClear
                            :model-value="filter.value as string"
                            :placeholder="getPlaceholder(filter)"
                            @enter="debouncedApply()"
                            @clear="debouncedApply()"
                            @blur="debouncedApply()"
                            @update:model-value="(val) => onValueChange(idx, val)"
                        />
                    </slot>

                    <UButton v-if="modelValue.length >= 1" icon="i-heroicons-x-mark" variant="ghost" size="xs" @click="emit('remove', idx)" />
                </div>
            </div>
        </div>

        <div class="filter-actions-lg">
            <UButton icon="i-heroicons-plus" color="primary" variant="outline" size="sm" @click="emit('add')">
                {{ $t('components.trade.table.advanced_filters.add') }}
            </UButton>
        </div>

    </div>

</template>

<script setup lang="ts">
import type { TradeFilter, FilterColumn, TradeFilterValue } from '~/type'
const { log_debug } = useLogView()

import {
    OPERATOR_EQUAL,
    OPERATOR_NOT_EQUAL,
    OPERATOR_GREATER_THAN,
    OPERATOR_GREATER_THAN_OR_EQUAL,
    OPERATOR_LESS_THAN,
    OPERATOR_LESS_THAN_OR_EQUAL,
    OPERATOR_IN,
    getDatePlaceholderFormat,
} from '~/utils'

const props = defineProps<{
    modelValue: TradeFilter[]
    columns: FilterColumn[]
    loading?: boolean
    tagGroups?: any[]
}>()

const emit = defineEmits<{
    'update:modelValue': [filters: TradeFilter[]]
    add: []
    remove: [index: number]
    apply: []
    reset: []
}>()

const allOperatorOptions = [
    { label: '=', value: OPERATOR_EQUAL },
    { label: '>', value: OPERATOR_GREATER_THAN },
    { label: '<', value: OPERATOR_LESS_THAN },
    { label: '>=', value: OPERATOR_GREATER_THAN_OR_EQUAL },
    { label: '<=', value: OPERATOR_LESS_THAN_OR_EQUAL },
    { label: '!=', value: OPERATOR_NOT_EQUAL },
    { label: '[ ... ]', value: OPERATOR_IN },
]

const getOperatorOptions = (columnName: string | undefined) => {
    if (!columnName) return allOperatorOptions

    const column = props.columns.find((c) => c.value === columnName)
    if (column?.operators) {
        return allOperatorOptions.filter((op) => column.operators!.includes(op.value))
    }

    return allOperatorOptions
}

const { t } = useI18n()

const typeItems = [
    { label: 'Buy', value: 'buy' },
    { label: 'Sell', value: 'sell' },
]

const getPlaceholder = (filter: TradeFilter) => {
    const column = props.columns.find((c) => c.value === filter.column)

    if (column?.dataType === 'date') {
        return getDatePlaceholderFormat()
    }

    return t('components.trade.table.advanced_filters.placeholder')
}

// Debounce l'application des filtres pour éviter trop de requêtes API
const debouncedApply = useDebounce(() => {
    emit('apply')
}, 300, { leading: true })

const onColumnChange = (index: number, value: string) => {
    const newFilters = [...props.modelValue]
    const column = props.columns.find((c) => c.value === value)

    newFilters[index] = {
        column: value,
        operator: column?.defaultOperator || OPERATOR_EQUAL,
        value: column?.defaultValue ?? '',
    }
    emit('update:modelValue', newFilters)
    debouncedApply()
}

const onOperatorChange = (index: number, value: string) => {
    const newFilters = [...props.modelValue]
    const filter = { ...newFilters[index], operator: value }
    if (filter.column === 'symbol') {
        filter.value = value === OPERATOR_IN ? [] : ''
    }
    newFilters[index] = filter
    emit('update:modelValue', newFilters)
    debouncedApply()
}

const onValueChange = (index: number, value: TradeFilterValue) => {
    const newFilters = [...props.modelValue]
    newFilters[index].value = value
    emit('update:modelValue', newFilters)
}
</script>
