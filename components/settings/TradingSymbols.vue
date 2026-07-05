<template>
    <SettingsSection
        :title="$t('components.settings.tradingSymbols.title')"
        :show-refresh="true"
        :loading="isLoading"
        @refresh="fetchSymbols"
    >
        <template #actions>
            <SymbolCreateModal @created="onSymbolCreated" @error="onSymbolError" />
        </template>

        <template #alert>
            <CommonAlertBox :success-str="successStr" :error-str="errorStr" />
        </template>

        <p class="text-secondary mb-6">
            {{ $t('components.settings.tradingSymbols.description') }}
        </p>

            <!-- Filtres avancés -->
            <CommonAdvancedFilters
                v-model="filters"
                :columns="filterableColumnsConfig"
                :loading="filterLoading"
                @add="addFilter"
                @remove="removeFilter"
                @apply="onApplyFilters"
                @reset="resetFilters"
            >
                <template #field-active="{ filter, onValueChange }">
                    <USelect
                        :model-value="filter.value as string"
                        :items="[
                            { label: $t('components.settings.tradingSymbols.active'), value: 'true' },
                            { label: $t('components.settings.tradingSymbols.inactive'), value: 'false' },
                        ]"
                        :placeholder="$t('components.settings.tradingSymbols.columns.active')"
                        class="min-w-[200px]"
                        @update:model-value="onValueChange"
                    />
                </template>
            </CommonAdvancedFilters>

        <!-- Liste des symboles -->
        <div v-if="symbols.length" class="mt-6">
            <UTable :key="locale" :data="paginatedSymbols" :columns="columns" class="w-full">
                    <template #symbol-cell="{ row }">
                        <span class="font-medium">{{ row.original.symbol }}</span>
                    </template>
                    <template #active-cell="{ row }">
                        <UBadge :color="row.original.active ? 'success' : 'neutral'">
                            {{
                                row.original.active
                                    ? $t('components.settings.tradingSymbols.active')
                                    : $t('components.settings.tradingSymbols.inactive')
                            }}
                        </UBadge>
                    </template>
                    <template #aliases-cell="{ row }">
                        <span class="text-secondary">{{ getAliasDisplay(row.original) || '—' }}</span>
                    </template>
                    <template #notes-cell="{ row }">
                        <span class="text-secondary">{{ row.original.notes || '—' }}</span>
                    </template>
                    <template #createdAt-cell="{ row }">
                        {{ formatDateWithUserTimezone(row.original.createdAt, settings, false, locale as 'fr' | 'en' | 'us') }}
                    </template>
                    <template #actions-cell="{ row }">
                        <div class="flex gap-2 items-center">
                            <UTooltip
                                :text="
                                    row.original.active
                                        ? $t('components.settings.tradingSymbols.disable')
                                        : $t('components.settings.tradingSymbols.enable')
                                "
                            >
                                <UButton :color="row.original.active ? 'neutral' : 'success'" size="xs" @click="onToggleSymbolStatus(row.original)">
                                    {{
                                        row.original.active
                                            ? $t('components.settings.tradingSymbols.disable')
                                            : $t('components.settings.tradingSymbols.enable')
                                    }}
                                </UButton>
                            </UTooltip>
                            <SymbolCreateModal :symbol="row.original" @updated="onSymbolUpdated" @error="onSymbolError">
                                <template #trigger>
                                    <UTooltip :text="$t('components.settings.tradingSymbols.edit')">
                                        <UButton
                                            icon="i-heroicons-pencil-square"
                                            color="primary"
                                            size="xs"
                                            variant="ghost"
                                        />
                                    </UTooltip>
                                </template>
                            </SymbolCreateModal>
                            <CommonModalDelete @confirm="onDelete(row.original.id)">
                                <template #trigger>
                                    <UTooltip :text="$t('common.actions.delete')">
                                        <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost" />
                                    </UTooltip>
                                </template>
                                <template #content> {{ $t('components.settings.tradingSymbols.confirm_delete') }} </template>
                            </CommonModalDelete>
                        </div>
                    </template>
                </UTable>
                <div v-if="paginatedSymbols.length" class="mt-4 flex justify-center">
                    <UPagination
                        v-model:page="page"
                        :page-count="pageCount"
                        :total="symbols.length"
                        :items-per-page="pageSize"
                        :ui="{
                            root: '',
                            item: 'min-w-[32px] mx-[5px] !rounded-full justify-center',
                        }"
                    />
                </div>
            </div>
        <div v-else class="p-8 text-center text-secondary">
            <p class="text-lg mb-2">{{ $t('components.settings.tradingSymbols.no_symbols') }}</p>
            <p class="text-sm">{{ $t('components.settings.tradingSymbols.no_symbols_description') }}</p>
        </div>
    </SettingsSection>
</template>

<script setup lang="ts">
import { formatDateWithUserTimezone } from '~/utils/date-utils'
import type { SymbolType, UpdateSymbolType } from '~/schema/symbol'
import type { SettingsContentType } from '~/schema/user'
import type { TradeFilter, FilterColumn } from '~/type'

const userStore = useUserStore()
const settings = userStore.user?.settings_object as SettingsContentType

const { t, locale } = useI18n()

const { log_error } = useLogView()
const { errorStr, successStr, displayMessage } = useAlert()

const addMeta = (defaultClass: string = 'w-[80px]') => {
    return {
        class: {
            td: defaultClass,
            th: defaultClass,
        },
    }
}

const columns = computed(() => {
    return [
        { id: 'actions', accessorKey: 'id', header: t('components.settings.tradingSymbols.columns.actions'), meta: addMeta('w-[60px]') },
        { id: 'symbol', accessorKey: 'symbol', header: t('components.settings.tradingSymbols.columns.symbol'), meta: addMeta() },
        { id: 'digit', accessorKey: 'digit', header: t('components.settings.tradingSymbols.columns.digit'), meta: addMeta() },
        { id: 'pricePerPoint', accessorKey: 'pricePerPoint', header: t('components.settings.tradingSymbols.columns.pricePerPoint'), meta: addMeta() },
        { id: 'active', accessorKey: 'active', header: t('components.settings.tradingSymbols.columns.active'), meta: addMeta() },
        { id: 'aliases', accessorKey: 'aliases', header: t('components.settings.tradingSymbols.columns.aliases'), meta: addMeta('w-[150px]') },
        // { id: 'createdAt', accessorKey: 'createdAt', header: t('components.settings.tradingSymbols.columns.createdAt'), meta: addMeta() },
        { id: 'notes', accessorKey: 'notes', header: t('components.settings.tradingSymbols.columns.notes'), meta: addMeta('w-[120px]') },
        {
            id: 'customKeys',
            accessorKey: 'customKeys',
            header: t('components.settings.tradingSymbols.columns.customKeys'),
            cell: ({ row }) => getCustomKeysDisplay(row.original),
            meta: addMeta('w-[120px]'),
        },
    ]
})

const { fetchSymbols: fetchSymbolsBase, createSymbol, updateSymbol, deleteSymbol: deleteSymbol_, symbols } = useSymbols()

const isLoading = ref(false)

const fetchSymbols = async () => {
    isLoading.value = true
    try {
        return await fetchSymbolsBase()
    } finally {
        isLoading.value = false
    }
}

const getAliasDisplay = (symbol: SymbolType) => {
    const fromMeta = symbol.metadata?.customFields?.find(f => f.key === 'aliases')?.value
    return fromMeta ?? symbol.aliases ?? ''
}

const getCustomKeysDisplay = (symbol: SymbolType) => {
    const fields = symbol.metadata?.customFields
    if (!fields || fields.length === 0) return ''
    return fields
        .filter(f => f.key !== 'aliases')
        .map(f => `${f.key}:${f.value}`)
        .join(', ')
}

onMounted(() => {
    fetchSymbols()
})

// Filtres avancés
const filters = ref<TradeFilter[]>([{ column: 'symbol', operator: '=', value: '' }])
const filterLoading = ref(false)

const filterableColumnsConfig = computed<FilterColumn[]>(() => [
    {
        label: t('components.settings.tradingSymbols.columns.symbol'),
        value: 'symbol',
        dataType: 'text',
        operators: ['=', '!='],
        defaultOperator: '=',
    },
    {
        label: t('components.settings.tradingSymbols.columns.active'),
        value: 'active',
        dataType: 'select',
        operators: ['='],
        defaultOperator: '=',
        defaultValue: 'true',
    },
    {
        label: t('components.settings.tradingSymbols.columns.aliases'),
        value: 'aliases',
        dataType: 'text',
        operators: ['=', '!='],
        defaultOperator: '=',
    },
])

const addFilter = () => {
    if (filters.value.length < 2) {
        filters.value.push({ column: 'symbol', operator: '=', value: '' })
    }
}

const removeFilter = (index: number) => {
    filters.value.splice(index, 1)
}

const resetFilters = () => {
    filters.value = [{ column: 'symbol', operator: '=', value: '' }]
    applyFilters()
}

const applyFilters = () => {
    // Les filtres sont appliqués via computed filteredSymbols
}

const onApplyFilters = () => {
    filterLoading.value = true
    setTimeout(() => {
        applyFilters()
        filterLoading.value = false
    }, 100)
}

// Filtrage des symboles
const filteredSymbols = computed(() => {
    return symbols.value.filter((symbol) => {
        return filters.value.every((filter) => {
            if (!filter.value && filter.value !== false && filter.value !== 0) return true

            const symbolValue = filter.column === 'aliases' ? getAliasDisplay(symbol) : symbol[filter.column as keyof typeof symbol]
            const filterValue = filter.value

            switch (filter.operator) {
                case '=':
                    if (filter.column === 'active') {
                        return symbol.active === (filterValue === 'true')
                    }
                    if (!symbolValue && symbolValue !== 0) return false
                    return String(symbolValue).toLowerCase().includes(String(filterValue).toLowerCase())
                case '!=':
                    if (filter.column === 'active') {
                        return symbol.active !== (filterValue === 'true')
                    }
                    if (!symbolValue && symbolValue !== 0) return true
                    return !String(symbolValue).toLowerCase().includes(String(filterValue).toLowerCase())
                default:
                    return true
            }
        })
    })
})

// Pagination pour UTable
const pageSize = 10
const page = ref(1)

const pageCount = computed(() => Math.max(1, Math.ceil(filteredSymbols.value.length / pageSize)))

const paginatedSymbols = computed(() => {
    const start = (page.value - 1) * pageSize
    const end = page.value * pageSize
    return filteredSymbols.value.slice(start, end)
})

watch([page, pageCount], () => {
    if (page.value > pageCount.value) {
        page.value = pageCount.value
    }
})

// Gérer la création d'un symbole via le modal
const onSymbolCreated = async () => {
    displayMessage(t('components.settings.tradingSymbols.symbol_created'), null)
    await fetchSymbols()
}

// Gérer la mise à jour d'un symbole via le modal
const onSymbolUpdated = async () => {
    displayMessage(t('components.settings.tradingSymbols.symbol_updated'), null)
    await fetchSymbols()
}

// Gérer les erreurs de création/édition de symbole
const onSymbolError = (error: string | null) => {
    if (error) {
        displayMessage(null, error)
    }
}

const onDelete = async (id: number) => {
    try {
        await deleteSymbol_(id)
        await fetchSymbols()
        displayMessage(t('components.settings.tradingSymbols.symbol_deleted'), null)
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        errorStr.value = message
        log_error(message)
    }
}

const onToggleSymbolStatus = async (symbol: UpdateSymbolType) => {
    try {
        await updateSymbol({ id: symbol.id, active: !symbol.active })
        await fetchSymbols()
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        errorStr.value = message
        log_error(message)
    }
}
</script>
