<template>
    <UForm id="tradeFiltersForm" :state="{}" @submit="debouncedApply">
        <div class="filter-container">
            <div class="flex items-center justify-between">
                <div class="section-label">{{ title }}</div>
                <PluginPageSlot v-if="showPluginSlot" :slot-id="slotId" />
            </div>
            <div class="action-buttons">
                <CommonAccountSelect
                    v-model="localAccountIds"
                    :items="accountOptions"
                    :placeholder="placeholder"
                    :all-label="allLabel"
                    :selected-label="selectedLabel"
                    select-class="select-standard"
                />
                <UCheckbox v-if="showInactiveCheckbox !== false" v-model="localShowInactive" class="mt-2" :label="$t('components.trade.table.show_inactive')" />
            </div>
            <slot name="after-accounts" />
        </div>

        <UCollapsible v-model:open="isFiltersOpen" class="flex flex-col gap-y-3 items-start">
            <UButton
                class="group"
                :label="$t('components.trade.table.advanced_filters.title')"
                :color="buttonColor"
                variant="ghost"
                size="sm"
                :class="buttonClass"
                trailing-icon="i-lucide-chevron-down"
                :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            />
            <template #content>
                <div class="flex flex-col gap-y-3 mx-4">
                    <CommonAdvancedFilters
                        v-model="localFilters"
                        :columns="filterableColumnsConfig"
                        :loading="filterLoading"
                        :tag-groups="tagGroups"
                        @add="addFilter"
                        @remove="removeFilter($event)"
                        @apply="emit('apply')"
                    >
                        <template #field-type="slotProps">
                            <slot name="field-type" v-bind="slotProps" />
                        </template>
                    </CommonAdvancedFilters>
                </div>
            </template>
        </UCollapsible>

        <div v-if="showColumnVisibility" class="filter-actions justify-start mt-4">
            <ColumnVisibilityMenu
                :table="table"
                :label-columns-header="labelColumnsHeader"
                :exclude-columns="excludeColumns"
                :button-class="columnVisibilityButtonClass"
            />
        </div>

        <div class="filter-actions-lg mt-4">
            <UButton type="submit" form="tradeFiltersForm" icon="i-lucide-filter" :loading="filterLoading" color="primary" variant="solid" size="sm">
                {{ $t('components.trade.table.advanced_filters.apply') }}
            </UButton>
            <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" size="xs" @click="emit('reset')">
                {{ $t('components.trade.table.advanced_filters.reset') }}
            </UButton>
        </div>
    </UForm>
</template>

<script setup lang="ts">
import type { TradeFilter, FilterColumn } from '~/type'
const { log_debug } = useLogView()
import { OPERATOR_EQUAL } from '~/utils'

const props = defineProps<{
    title: string
    slotId: string
    accountIds: number[]
    showInactive: boolean
    filters: TradeFilter[]
    filterLoading?: boolean
    accountOptions: any[]
    placeholder: string
    allLabel: string
    selectedLabel: string
    filterableColumnsConfig: FilterColumn[]
    showColumnVisibility?: boolean
    showPluginSlot?: boolean
    table?: any
    labelColumnsHeader?: any
    excludeColumns?: string[]
    columnVisibilityButtonClass?: string
    showAdvancedFilters: boolean
    showInactiveCheckbox?: boolean
    tagGroups?: any[]
    lastFilterColumn?: string
    maxFilters?: number
}>()

const emit = defineEmits<{
    'update:accountIds': [value: number[]]
    'update:showInactive': [value: boolean]
    'update:filters': [value: TradeFilter[]]
    'update:showAdvancedFilters': [value: boolean]
    'update:lastFilterColumn': [value: string]
    apply: []
    reset: []
}>()

const localAccountIds = computed({
    get: () => props.accountIds,
    set: (val) => emit('update:accountIds', val)
})

const localShowInactive = computed({
    get: () => props.showInactive,
    set: (val) => emit('update:showInactive', val)
})

const localFilters = computed({
    get: () => props.filters,
    set: (val) => emit('update:filters', val)
})

const maxFiltersCount = computed(() => props.maxFilters ?? 4)

// Debounce l'application des filtres pour éviter trop de requêtes API
const debouncedApply = useDebounce(() => {
    emit('apply')
}, 500, { leading: true })

const addFilter = () => {
    if (localFilters.value.length < maxFiltersCount.value) {
        const column = props.lastFilterColumn || 'symbol'
        localFilters.value = [...localFilters.value, { column, operator: OPERATOR_EQUAL, value: '' }]
    }
}

const removeFilter = (idx: number) => {
    const removedFilter = localFilters.value[idx]
    if (removedFilter?.column) {
        emit('update:lastFilterColumn', removedFilter.column)
    }
    const newFilters = [...localFilters.value]
    newFilters.splice(idx, 1)
    localFilters.value = newFilters
    debouncedApply()
}

watch(() => props.filters.map(f => f.column), (newColumns, oldColumns) => {
    if (!oldColumns) return
    for (let i = 0; i < newColumns.length; i++) {
        if (newColumns[i] !== oldColumns[i] && newColumns[i]) {
            emit('update:lastFilterColumn', newColumns[i])
        }
    }
})

const isFiltersOpen = computed({
    get: () => props.showAdvancedFilters,
    set: (val) => emit('update:showAdvancedFilters', val)
})

const hasActiveFilters = computed(() => {
    return props.filters.some(filter => filter.value !== '' && filter.value !== null && filter.value !== undefined)
})

const isDark = useIsDark()

const buttonColor = computed(() => {
    if (hasActiveFilters.value) {
        return isDark.value ? 'error' : 'neutral'
    }
    return 'neutral'
})

const buttonClass = computed(() => {
    const classes = ['w-48']
    if (hasActiveFilters.value && !isDark.value) {
        classes.push('font-bold')
    }
    return classes.join(' ')
})
</script>
