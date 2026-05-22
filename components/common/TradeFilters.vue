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
    </div>

    <UCollapsible v-model:open="isFiltersOpen" class="flex flex-col gap-y-4">
        <UButton
            class="group"
            :label="$t('components.trade.table.advanced_filters.title')"
            color="neutral"
            variant="ghost"
            size="sm"
            :class="'w-48'"
            trailing-icon="i-lucide-chevron-down"
            :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
        />
        <template #content>
            <div class="flex flex-col gap-y-4">
                <CommonAdvancedFilters
                    v-model="localFilters"
                    :columns="filterableColumnsConfig"
                    :loading="filterLoading"
                    @add="emit('add')"
                    @remove="emit('remove', $event)"
                    @apply="emit('apply')"
                    @reset="emit('reset')"
                >
                    <template #field-type="slotProps">
                        <slot name="field-type" v-bind="slotProps" />
                    </template>
                </CommonAdvancedFilters>

                <div v-if="showColumnVisibility" class="filter-actions justify-start">
                    <ColumnVisibilityMenu
                        :table="table"
                        :label-columns-header="labelColumnsHeader"
                        :exclude-columns="excludeColumns"
                        :button-class="columnVisibilityButtonClass"
                    />
                </div>
            </div>
        </template>
    </UCollapsible>
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
</script>
