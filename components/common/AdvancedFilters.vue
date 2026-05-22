<template>
    <div class="flex flex-row gap-x-4 items-start">

        <div class="flex flex-col gap-2">
            <div v-for="(filter, idx) in modelValue" :key="idx" class="filter-actions-nowrap">
                <USelect
                    :model-value="filter.column"
                    :items="columns"
                    class="min-w-[200px] select-none"
                    @update:model-value="(val) => onColumnChange(idx, val)"
                />
                <USelect
                    :model-value="filter.operator"
                    :items="getOperatorOptions(filter.column)"
                    class="w-20 select-none"
                    @update:model-value="(val) => onOperatorChange(idx, val)"
                />

                <!-- Slot pour champ personnalisé -->
                <slot :name="`field-${filter.column}`" :filter="filter" :index="idx" :on-value-change="(val: any) => onValueChange(idx, val)">
                    <!-- Champ par défaut -->
                    <CommonFilterClear
                        :model-value="filter.value as string"
                        :placeholder="getPlaceholder(filter)"
                        @enter="emit('apply')"
                        @update:model-value="(val) => onValueChange(idx, val)"
                    />
                </slot>

                <UButton v-if="modelValue.length > 1" icon="i-heroicons-x-mark" variant="ghost" size="xs" @click="emit('remove', idx)" />
            </div>
        </div>

        <div class="filter-actions-lg">
            <UButton icon="i-heroicons-plus" color="primary" variant="outline" size="sm" @click="emit('add')">
                {{ $t('components.trade.table.advanced_filters.add') }}
            </UButton>
            <UButton icon="i-lucide-filter" :loading="loading" color="primary" variant="solid" size="sm" @click="emit('apply')">
                {{ $t('components.trade.table.advanced_filters.apply') }}
            </UButton>
            <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" size="xs" @click="emit('reset')">
                {{ $t('components.trade.table.advanced_filters.reset') }}
            </UButton>
        </div>

    </div>

</template>

<script setup lang="ts">
import type { TradeFilter, FilterColumn, TradeFilterValue } from '~/type'

import {
    OPERATOR_EQUAL,
    OPERATOR_NOT_EQUAL,
    OPERATOR_GREATER_THAN,
    OPERATOR_GREATER_THAN_OR_EQUAL,
    OPERATOR_LESS_THAN,
    OPERATOR_LESS_THAN_OR_EQUAL,
    getDatePlaceholderFormat,
} from '~/utils'

const props = defineProps<{
    modelValue: TradeFilter[]
    columns: FilterColumn[]
    loading?: boolean
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

const getPlaceholder = (filter: TradeFilter) => {
    const column = props.columns.find((c) => c.value === filter.column)

    if (column?.dataType === 'date') {
        return getDatePlaceholderFormat()
    }

    return t('components.trade.table.advanced_filters.placeholder')
}

const onColumnChange = (index: number, value: string) => {
    const newFilters = [...props.modelValue]
    const column = props.columns.find((c) => c.value === value)

    newFilters[index] = {
        column: value,
        operator: column?.defaultOperator || OPERATOR_EQUAL,
        value: column?.defaultValue ?? '',
    }

    emit('update:modelValue', newFilters)
}

const onOperatorChange = (index: number, value: string) => {
    const newFilters = [...props.modelValue]
    newFilters[index].operator = value
    emit('update:modelValue', newFilters)
}

const onValueChange = (index: number, value: TradeFilterValue) => {
    const newFilters = [...props.modelValue]
    newFilters[index].value = value
    emit('update:modelValue', newFilters)

    // Auto-apply si la valeur est vidée
    if (value === '' || value === null) {
        emit('apply')
    }
}
</script>
