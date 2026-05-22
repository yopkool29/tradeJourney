<template>
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
            <UCheckbox v-model="localShowInactive" class="mt-2" :label="$t('components.trade.table.show_inactive')" />
        </div>
        <slot name="after-accounts" />
    </div>

    <UCollapsible v-model:open="isFiltersOpen" class="flex flex-col gap-y-4 items-start">
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
            <div class="flex flex-col gap-y-4 pr-2">
                <CommonAdvancedFilters
                    v-model="localFilters"
                    :columns="filterableColumnsConfig"
                    :loading="filterLoading"
                    @add="emit('add')"
                    @remove="emit('remove', $event)"
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
        <UButton icon="i-lucide-filter" :loading="filterLoading" color="primary" variant="solid" size="sm" @click="emit('apply')">
            {{ $t('components.trade.table.advanced_filters.apply') }}
        </UButton>
        <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" size="xs" @click="emit('reset')">
            {{ $t('components.trade.table.advanced_filters.reset') }}
        </UButton>
    </div>
</template>

<script setup lang="ts">
import type { TradeFilter, FilterColumn } from '~/type'

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
}>()

const emit = defineEmits<{
    'update:accountIds': [value: number[]]
    'update:showInactive': [value: boolean]
    'update:filters': [value: TradeFilter[]]
    'update:showAdvancedFilters': [value: boolean]
    add: []
    remove: [index: number]
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
