<template>
    <UForm id="tradeFiltersForm" :state="{}" @submit="onExplicitApply">
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
                >
                    <template #before-badges>
                        <UCheckbox v-if="showInactiveCheckbox !== false" v-model="localShowInactive" :label="$t('components.trade.table.show_inactive')" />
                    </template>
                </CommonAccountSelect>
            </div>
            <slot name="after-accounts" />
        </div>

        <UCollapsible v-model:open="isFiltersOpen" class="flex flex-col gap-y-3 items-start">
            <UButton
                class="group px-1"
                :label="$t('components.trade.table.advanced_filters.title')"
                :color="buttonColor"
                variant="ghost"
                size="sm"
                :class="buttonClass"
                leading-icon="i-lucide-filter"
                trailing-icon="i-lucide-chevron-down"
                :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            />
            <template #content>
                <div class="flex flex-col gap-y-3 mx-4">
                    <CommonAdvancedFilters
                        v-model="localFilters"
                        :columns="columnsConfig"
                        :loading="filterLoading"
                        :tag-groups="tagGroups"
                        :is-auto-apply-mode="isAutoApplyMode"
                        @add="addFilter"
                        @remove="removeFilter($event)"
                        @apply="onExplicitApply"
                    />
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
            <UButton
                type="submit"
                form="tradeFiltersForm"
                icon="i-lucide-filter"
                :trailing-icon="props.dirty ? 'i-lucide-alert-circle' : undefined"
                :loading="filterLoading"
                :color="applyButtonColor"
                variant="solid"
                size="sm"
            >
                {{ $t('common.actions.apply') }}
            </UButton>
            <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" size="xs" @click="emit('reset')">
                {{ $t('components.trade.table.advanced_filters.clear') }}
            </UButton>
        </div>
    </UForm>
</template>

<script setup lang="ts">
import type { TradeFilter, FilterColumn } from '~/type'
import {
	OPERATOR_EQUAL,
	OPERATOR_NOT_EQUAL,
	OPERATOR_GREATER_THAN_OR_EQUAL,
	OPERATOR_IN,
} from '~/utils'

const { log_debug } = useLogView()
const { t } = useI18n()

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
    filterableColumnsConfig?: FilterColumn[]
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
    dirty?: boolean
}>()

const emit = defineEmits<{
    'update:accountIds': [value: number[]]
    'update:showInactive': [value: boolean]
    'update:filters': [value: TradeFilter[]]
    'update:showAdvancedFilters': [value: boolean]
    'update:lastFilterColumn': [value: string]
    'update:dirty': [value: boolean]
    apply: []
    reset: []
    remove: [isLast: boolean]
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

// Default filterable columns config for trade-related filters
const defaultFilterableColumnsConfig = computed<FilterColumn[]>(() => [
	{
		label: t('components.trade.table.filters.openDate'),
		value: 'openDate',
		type: 'date' as const,
	},
	{
		label: t('components.trade.table.filters.closeDate'),
		value: 'closeDate',
		type: 'date' as const,
	},
	{
		label: t('components.trade.table.filters.symbol'),
		value: 'symbol',
		operators: [OPERATOR_EQUAL, OPERATOR_NOT_EQUAL, OPERATOR_IN],
		defaultOperator: OPERATOR_EQUAL,
	},
	{
		label: t('components.trade.table.filters.type'),
		value: 'type',
		type: 'select' as const,
		operators: [OPERATOR_EQUAL, OPERATOR_NOT_EQUAL],
		defaultOperator: OPERATOR_EQUAL,
		defaultValue: 'buy',
	},
	{
		label: t('components.trade.table.filters.lot'),
		value: 'lot',
		type: 'number' as const,
	},
	{
		label: t('components.trade.table.filters.openPrice'),
		value: 'openPrice',
		type: 'number' as const,
	},
	{
		label: t('components.trade.table.filters.closePrice'),
		value: 'closePrice',
		type: 'number' as const,
	},
	{
		label: t('components.trade.table.filters.profit'),
		value: 'profit',
		type: 'number' as const,
		defaultOperator: OPERATOR_GREATER_THAN_OR_EQUAL,
	},
	{
		label: t('components.trade.table.filters.tags'),
		value: 'tags',
		type: 'number' as const,
		operators: [OPERATOR_IN],
		defaultOperator: OPERATOR_IN,
	},
])

const columnsConfig = computed(() => props.filterableColumnsConfig ?? defaultFilterableColumnsConfig.value)

const maxFiltersCount = computed(() => props.maxFilters ?? 4)

const onExplicitApply = () => {
    emit('apply')
}

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
    // Si dernier filtre supprimé, c'est comme "Effacer" (apply direct)
    // Sinon, compter et voir si auto/manuel
    const isLast = newFilters.length === 0
    emit('remove', isLast)
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

const applyButtonColor = computed(() => {
    if (props.dirty) {
        return 'warning'
    }
    return 'primary'
})
</script>
