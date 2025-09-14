<template>
    <div>
        <!-- Barre de filtres avancés -->
        <UCard class="mb-4 md:max-w-5xl min-w-md">
            <template #default>
                <div class="flex flex-col mb-4 gap-4">
                    <div class="font-semibold">{{ $t('components.trade.table.accounts.title') }}</div>
                    <div class="flex flex-row gap-2">
                        <USelect
                            v-model="userStore.tradeOptions.accountIds"
                            :items="accountOptions"
                            :placeholder="$t('components.trade.table.accounts.placeholder')"
                            multiple
                            size="lg"
                            class="min-w-[200px] max-w-[300px] w-full"
                        >
                            <div>
                                <span v-if="!userStore.tradeOptions.accountIds?.length"> {{ $t('components.trade.table.accounts.all') }} </span>
                                <span v-else>
                                    {{ $t('components.trade.table.accounts.selected', { count: userStore.tradeOptions.accountIds?.length }) }}
                                </span>
                            </div>
                        </USelect>
                        <UCheckbox v-model="userStore.tradeOptions.showInactive" class="mt-2" :label="$t('components.trade.table.show_inactive')" />
                    </div>
                </div>

                <div class="flex flex-wrap gap-2 items-end">
                    <div v-for="(filter, idx) in filters" :key="idx" class="flex gap-2 items-end">
                        <USelect
                            v-model="filter.column"
                            :items="filterableColumns"
                            class="min-w-[200px] no-select"
                            @update:model-value="
                                (val) => {
                                    filter.value = ''
                                    if (val === 'type') {
                                        filter.operator = OPERATOR_EQUAL
                                        filter.value = 'buy'
                                    } else if (val == 'symbol') {
                                        filter.operator = OPERATOR_EQUAL
                                    }
                                    if (val === 'profit') {
                                        filter.operator = OPERATOR_GREATER_THAN_OR_EQUAL
                                    }
                                }
                            "
                        />
                        <USelect v-model="filter.operator" :items="getOperatorOptions(filter.column)" class="w-16 no-select" />

                        <!-- Champ spécifique pour le type (Buy/Sell) -->
                        <USelect
                            v-if="filter.column === 'type'"
                            v-model="filter.value as string"
                            :items="[
                                { label: 'Buy', value: 'buy' },
                                { label: 'Sell', value: 'sell' },
                            ]"
                            placeholder="Buy/Sell"
                            class="min-w-[200px]"
                            @update:model-value="() => {}"
                        />

                        <!-- Champ standard pour les autres colonnes -->
                        <CommonFilterClear
                            v-else
                            v-model="filter.value as string"
                            :placeholder="getFilterPlaceholder(filter)"
                            @enter="onApplyFilters"
                            @update:model-value="
                                (val) => {
                                    if (val === '' || val === null) onApplyFilters()
                                }
                            "
                        />
                        <UButton v-if="filters.length > 1" icon="i-heroicons-x-mark" variant="ghost" size="xs" @click="removeFilter(idx)" />
                    </div>
                    <UButton icon="i-heroicons-plus" color="primary" variant="outline" size="sm" @click="addFilter">{{
                        $t('components.trade.table.advanced_filters.add')
                    }}</UButton>
                    <UButton icon="i-lucide-filter" :loading="filterLoading" color="primary" variant="solid" size="sm" @click="onApplyFilters">{{
                        $t('components.trade.table.advanced_filters.apply')
                    }}</UButton>
                    <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" size="xs" @click="resetFilters">{{
                        $t('components.trade.table.advanced_filters.reset')
                    }}</UButton>
                    <UDropdownMenu
                        class="flex justify-end"
                        :items="
                            table?.tableApi
                                ?.getAllColumns()
                                .filter((column) => column.getCanHide() && !['actions', 'symbol', 'type', 'profit'].includes(column.id))
                                .map((column) => ({
                                    label: labelColumnsHeader[column.id] as string,
                                    type: 'checkbox' as const,
                                    checked: column.getIsVisible(),
                                    onUpdateChecked(checked: boolean) {
                                        table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                                    },
                                    onSelect(e?: Event) {
                                        e?.preventDefault()
                                    },
                                }))
                        "
                        :content="{ align: 'end' }"
                    >
                        <UButton
                            class="ml-auto"
                            :label="$t('components.common.columns.button')"
                            color="neutral"
                            size="sm"
                            variant="outline"
                            trailing-icon="i-lucide-chevron-down"
                        />
                    </UDropdownMenu>
                </div>
            </template>
        </UCard>
        <div class="flex flex-wrap gap-2 mb-2 items-center">
            <span class="text-xs text-gray-500 ml-2">{{ $t('components.trade.table.results_count', { count: sortedTrades.length }) }}</span>
        </div>
        <div class="w-full">
            <CommonModalScreenshotCarousel :open="showScreenshots" :screenshots="currentScreenshots" @closed="showScreenshots = false" />
            <UTable
                ref="table"
                v-model:column-visibility="userStore.columnVisibility"
                :data="paginatedTrades"
                :columns="columns"
                :loading="tableIsLoading"
                :empty-state="{ icon: 'i-heroicons-document-text', label: $t('components.trade.table.empty_state') }"
                :ui="{ td: 'p-2' }"
                class="table-fixed"
                @sort="onSort"
            >
                <template #actions-cell="{ row }">
                    <div class="flex gap-2" :class="{ 'bg-amber-200 dark:bg-amber-900/50 rounded': row.original.active === false }">
                        <UTooltip :text="$t('components.trade.table.edit_button')">
                            <UButton
                                icon="i-heroicons-pencil-square"
                                size="xs"
                                color="primary"
                                variant="ghost"
                                @click="$emit('edit', row.original)"
                                >{{ $t('components.trade.table.edit_button') }}</UButton
                            >
                        </UTooltip>
                        <CommonModalDelete
                            v-if="row.original.active === false"
                            :from="'trade'"
                            :title="$t('components.trade.table.activate_title')"
                            :confirm-text="$t('common.actions.confirm')"
                            confirm-color="primary"
                            @confirm="onUndelete(row.original.id!)"
                        >
                            <template #trigger>
                                <UTooltip :text="$t('components.trade.table.activate_button')">
                                    <UButton icon="i-lucide-archive-restore" size="xs" color="primary" variant="ghost"></UButton>
                                </UTooltip>
                            </template>
                            <template #content>{{ $t('components.trade.table.activate_confirm') }}</template>
                        </CommonModalDelete>
                        <CommonModalDelete v-else :from="'trade'" @confirm="onDelete(row.original.id!)">
                            <template #trigger>
                                <UTooltip :text="$t('components.trade.table.deactivate_button')">
                                    <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost"></UButton>
                                </UTooltip>
                            </template>
                            <template #content>{{ $t('components.trade.table.deactivate_confirm') }}</template>
                        </CommonModalDelete>
                    </div>
                </template>
                <template #symbol-cell="{ row }">
                    <span class="font-semibold">{{ row.original.symbol }}</span>
                </template>
                <template #openDate-cell="{ row }">
                    {{ formatDate(row.original.openDate, true, locale) }}
                </template>
                <template #closeDate-cell="{ row }">
                    {{ formatDate(row.original.closeDate, true, locale) }}
                </template>
                <template #openPrice-cell="{ row }">
                    <span class="font-semibold">
                        {{ row.original.openPrice.toFixed(getDigitFromSymbol(row.original.symbol)) }}
                    </span>
                </template>
                <template #account-cell="{ row }">
                    <span class="font-semibold">
                        {{ row.original.account_displayName }}
                    </span>
                </template>
                <template #closePrice-cell="{ row }">
                    <span class="font-semibold">
                        {{ row.original.closePrice.toFixed(getDigitFromSymbol(row.original.symbol)) }}
                    </span>
                </template>
                <template #profit-cell="{ row }">
                    <span class="font-semibold" :class="row.original.profit >= 0 ? 'text-green-600' : 'text-red-600'">
                        {{ formatCurrency(row.original.profit) }}
                    </span>
                </template>
                <template #type-cell="{ row }">
                    <UBadge size="md" :class="row.original.type === 'buy' ? 'dark:bg-green-300 bg-emerald-500' : 'dark:bg-red-300 bg-orange-500'">
                        {{ row.original.type === 'buy' ? $t('common.trade_types.buy') : $t('common.trade_types.sell') }}
                    </UBadge>
                </template>
            </UTable>
        </div>
        <div v-if="!paginatedTrades.length && !tableIsLoading">
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">
                <div class="text-lg mb-2">{{ $t('components.trade.table.no_trades.title') }}</div>
                <div class="text-sm">{{ $t('components.trade.table.no_trades.description') }}</div>
            </div>
        </div>
        <div class="flex justify-center mt-4 items-center gap-4">
            <div v-if="paginatedTrades.length">
                <UPagination
                    v-model:page="page"
                    :page-count="pageCount"
                    :total="sortedTrades.length"
                    :items-per-page="pageSize"
                    :ui="{
                        root: '',
                        item: 'min-w-[32px] mx-[5px] !rounded-full justify-center',
                    }"
                />
            </div>
            <div class="flex items-center gap-2">
                <USelect
                    v-model="userStore.tradeOptions.nbLines"
                    :items="[10, 15, 20, 30, 40, 50].map((n) => ({ value: n, label: n.toString() }))"
                    class="w-20"
                />
                <span class="text-sm text-gray-500 whitespace-nowrap">lignes</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { TradeType } from '~/schema/trade'
import type { TradeFilter } from '~/type'
import { UIcon } from '#components'
import {
    OPERATOR_EQUAL,
    OPERATOR_NOT_EQUAL,
    OPERATOR_GREATER_THAN,
    OPERATOR_GREATER_THAN_OR_EQUAL,
    OPERATOR_LESS_THAN,
    OPERATOR_LESS_THAN_OR_EQUAL,
    formatDate,
    parseDateStringToTimestamp,
    getDatePlaceholderFormat,
    formatCurrency,
} from '~/utils'
import type { Value } from '@prisma/client/runtime/library'

const UTooltipComp = resolveComponent('UTooltip')
const UButtonComp = resolveComponent('UButton')

const { t, locale } = useI18n()
const { trades, fetchTrades, deleteTrade, unDeleteTrade } = useTrades()
const { fetchSymbols, getDigitFromSymbol } = useSymbols()
const { accounts, fetchAccounts } = useAccount()
const userStore = useUserStore()

const pageSize = computed(() => userStore.tradeOptions.nbLines)
const page = ref(1)

const sortBy = ref<keyof TradeType | ''>('')
const sortDesc = ref(false)

const tableIsLoading = ref(false)
const filterLoading = ref(false)
const table = useTemplateRef('table')
// État pour gérer l'affichage de la modal de captures d'écran
const showScreenshots = ref(false)
const currentScreenshots = ref<Array<{ id?: number; url: string }>>([])

const accountOptions = computed(() => {
    return accounts.value.map((account) => {
        return {
            label: account.displayName,
            value: account.id,
        }
    })
})

const labelColumnsHeader = computed(() => {
    return {
        actions: t('components.common.columns.headers.actions'),
        note: t('components.common.columns.headers.note'),
        tags: t('components.common.columns.headers.tags'),
        screenshots: t('components.common.columns.headers.screenshots'),
        symbol: t('components.common.columns.headers.symbol'),
        account: t('components.common.columns.headers.account'),
        type: t('components.common.columns.headers.type'),
        lot: t('components.common.columns.headers.lot'),
        openDate: t('components.common.columns.headers.openHour'),
        closeDate: t('components.common.columns.headers.closeHour'),
        openHour: t('components.common.columns.headers.openHour'),
        closeHour: t('components.common.columns.headers.closeHour'),
        openPrice: t('components.common.columns.headers.openPrice'),
        closePrice: t('components.common.columns.headers.closePrice'),
        profit: t('components.common.columns.headers.profit'),
        // Index signature is added via the type assertion below
    }
})

// Filtres avancés
const filterableColumns = [
    { label: t('components.trade.table.filters.openDate'), value: 'openDate' },
    { label: t('components.trade.table.filters.closeDate'), value: 'closeDate' },
    { label: t('components.trade.table.filters.symbol'), value: 'symbol' },
    { label: t('components.trade.table.filters.type'), value: 'type' },
    { label: t('components.trade.table.filters.lot'), value: 'lot' },
    { label: t('components.trade.table.filters.openPrice'), value: 'openPrice' },
    { label: t('components.trade.table.filters.closePrice'), value: 'closePrice' },
    { label: t('components.trade.table.filters.profit'), value: 'profit' },
]

const allOperatorOptions = [
    { label: '=', value: OPERATOR_EQUAL },
    { label: '>', value: OPERATOR_GREATER_THAN },
    { label: '<', value: OPERATOR_LESS_THAN },
    { label: '>=', value: OPERATOR_GREATER_THAN_OR_EQUAL },
    { label: '<=', value: OPERATOR_LESS_THAN_OR_EQUAL },
    { label: '!=', value: OPERATOR_NOT_EQUAL },
]

// Fonction pour obtenir les opérateurs disponibles selon le type de colonne
const getOperatorOptions = (columnName: string | undefined) => {
    if (!columnName) return allOperatorOptions

    // Colonnes avec opérateurs limités
    const columnOperatorMap: Record<string, Array<{ label: string; value: string }>> = {
        type: [{ label: '=', value: OPERATOR_EQUAL }],
        symbol: [{ label: '=', value: OPERATOR_EQUAL }],
    }
    return columnOperatorMap[columnName] || allOperatorOptions
}

const filters = useState<TradeFilter[]>('filters', () => [{ column: 'symbol', operator: OPERATOR_EQUAL, value: '' }])

const addMeta = (defaultClass: string = 'w-[80px]') => {
    return {
        class: {
            td: defaultClass,
        },
    }
}

// Fonction pour ouvrir la modal des captures d'écran
const openScreenshotsModal = (screenshots: Array<{ id?: number; url: string }>) => {
    currentScreenshots.value = screenshots
    showScreenshots.value = true
}

const columns = [
    {
        id: 'screenshots',
        accessorKey: 'screenshots',
        header: () => h('div', { class: 'flex items-center' }, [h(UIcon, { name: 'i-lucide-image', class: 'w-4 h-4' })]),
        cell: ({ row }) => {
            const screenshots = row.original.screenshots || []
            const hasScreenshots = screenshots.length > 0 || row.original.screenshotUrl

            if (!hasScreenshots) return null

            // Si on a à la fois des captures dans le tableau et l'ancien screenshotUrl
            const allScreenshots = [
                ...screenshots,
                ...(row.original.screenshotUrl && !screenshots.some((s) => s.url === row.original.screenshotUrl)
                    ? [{ url: row.original.screenshotUrl }]
                    : []),
            ]

            return h('div', { class: 'flex justify-center items-center h-full' }, [
                h(
                    UTooltipComp,
                    {
                        text:
                            allScreenshots.length > 1
                                ? t('components.common.columns.screenshots.multiple', { count: allScreenshots.length })
                                : t('components.common.columns.screenshots.single'),
                        class: 'flex items-center justify-center',
                    },
                    () =>
                        h(
                            UButtonComp,
                            {
                                variant: 'ghost',
                                color: 'neutral',
                                icon: 'i-heroicons-photo',
                                class: [
                                    'text-gray-500 dark:text-gray-400',
                                    'hover:text-primary-500 dark:hover:text-primary-400',
                                    'transition-colors duration-200',
                                    'p-0',
                                ],
                                onClick: (e: Event) => {
                                    e.stopPropagation()
                                    openScreenshotsModal(allScreenshots)
                                },
                                'aria-label': t('components.common.columns.screenshots.aria_label'),
                            },
                            {}
                        )
                ),
            ])
        },
        meta: addMeta('w-[40px]'),
    },
    {
        id: 'actions',
        accessorKey: 'actions',
        header: labelColumnsHeader.value.actions,
        meta: addMeta(),
    },
    {
        id: 'openDate',
        accessorKey: 'openDate',
        header: () =>
            h(
                'button',
                {
                    class: 'flex items-center gap-1 select-none',
                    onClick: () =>
                        onSort({
                            column: { accessorKey: 'openDate' },
                            direction: sortBy.value === 'openDate' && !sortDesc.value ? 'desc' : 'asc',
                        }),
                },
                [
                    labelColumnsHeader.value.openDate,
                    h(UIcon, {
                        name:
                            sortBy.value === 'openDate'
                                ? sortDesc.value
                                    ? 'i-lucide-arrow-down-wide-narrow'
                                    : 'i-lucide-arrow-up-narrow-wide'
                                : 'i-lucide-arrow-up-down',
                        class: 'w-4 h-4 ml-1',
                    }),
                ]
            ),
        cell: ({ row }) => formatDate(row.getValue('openDate')),
        sortable: true,
        meta: addMeta('w-[150px]'),
    },
    {
        id: 'closeDate',
        accessorKey: 'closeDate',
        header: () =>
            h(
                'button',
                {
                    class: 'flex items-center gap-1 select-none',
                    onClick: () =>
                        onSort({
                            column: { accessorKey: 'closeDate' },
                            direction: sortBy.value === 'closeDate' && !sortDesc.value ? 'desc' : 'asc',
                        }),
                },
                [
                    labelColumnsHeader.value.closeDate,
                    h(UIcon, {
                        name:
                            sortBy.value === 'closeDate'
                                ? sortDesc.value
                                    ? 'i-lucide-arrow-down-wide-narrow'
                                    : 'i-lucide-arrow-up-narrow-wide'
                                : 'i-lucide-arrow-up-down',
                        class: 'w-4 h-4 ml-1',
                    }),
                ]
            ),
        cell: ({ row }) => formatDate(row.getValue('closeDate')),
        sortable: true,
        meta: addMeta('w-[150px]'),
    },
    {
        id: 'symbol',
        accessorKey: 'symbol',
        header: () =>
            h(
                'button',
                {
                    class: 'flex items-center gap-1 select-none',
                    onClick: () =>
                        onSort({
                            column: { accessorKey: 'symbol' },
                            direction: sortBy.value === 'symbol' && !sortDesc.value ? 'desc' : 'asc',
                        }),
                },
                [
                    labelColumnsHeader.value.symbol,
                    h(UIcon, {
                        name:
                            sortBy.value === 'symbol'
                                ? sortDesc.value
                                    ? 'i-lucide-arrow-down-wide-narrow'
                                    : 'i-lucide-arrow-up-narrow-wide'
                                : 'i-lucide-arrow-up-down',
                        class: 'w-4 h-4 ml-1',
                    }),
                ]
            ),
        sortable: true,
        meta: addMeta(),
    },
    {
        id: 'account',
        accessorKey: 'account',
        header: () =>
            h(
                'button',
                {
                    class: 'flex items-center gap-1 select-none',
                    onClick: () =>
                        onSort({
                            column: { accessorKey: 'account' },
                            direction: sortBy.value === 'account' && !sortDesc.value ? 'desc' : 'asc',
                        }),
                },
                [
                    labelColumnsHeader.value.account,
                    h(UIcon, {
                        name:
                            sortBy.value === 'account'
                                ? sortDesc.value
                                    ? 'i-lucide-arrow-down-wide-narrow'
                                    : 'i-lucide-arrow-up-narrow-wide'
                                : 'i-lucide-arrow-up-down',
                        class: 'w-4 h-4 ml-1',
                    }),
                ]
            ),
        sortable: true,
        meta: addMeta(),
    },
    {
        id: 'type',
        accessorKey: 'type',
        header: () =>
            h(
                'button',
                {
                    class: 'flex items-center gap-1 select-none',
                    onClick: () =>
                        onSort({
                            column: { accessorKey: 'type' },
                            direction: sortBy.value === 'type' && !sortDesc.value ? 'desc' : 'asc',
                        }),
                },
                [
                    labelColumnsHeader.value.type,
                    h(UIcon, {
                        name:
                            sortBy.value === 'type'
                                ? sortDesc.value
                                    ? 'i-lucide-arrow-down-wide-narrow'
                                    : 'i-lucide-arrow-up-narrow-wide'
                                : 'i-lucide-arrow-up-down',
                        class: 'w-4 h-4 ml-1',
                    }),
                ]
            ),
        sortable: true,
        meta: addMeta(),
    },
    {
        id: 'lot',
        accessorKey: 'lot',
        header: () =>
            h(
                'button',
                {
                    class: 'flex items-center gap-1 select-none',
                    onClick: () =>
                        onSort({
                            column: { accessorKey: 'lot' },
                            direction: sortBy.value === 'lot' && !sortDesc.value ? 'desc' : 'asc',
                        }),
                },
                [
                    labelColumnsHeader.value.lot,
                    h(UIcon, {
                        name:
                            sortBy.value === 'lot'
                                ? sortDesc.value
                                    ? 'i-lucide-arrow-down-wide-narrow'
                                    : 'i-lucide-arrow-up-narrow-wide'
                                : 'i-lucide-arrow-up-down',
                        class: 'w-4 h-4 ml-1',
                    }),
                ]
            ),
        sortable: true,
        meta: addMeta(),
    },
    {
        id: 'openPrice',
        accessorKey: 'openPrice',
        header: () =>
            h(
                'button',
                {
                    class: 'flex items-center gap-1 select-none',
                    onClick: () =>
                        onSort({
                            column: { accessorKey: 'openPrice' },
                            direction: sortBy.value === 'openPrice' && !sortDesc.value ? 'desc' : 'asc',
                        }),
                },
                [
                    labelColumnsHeader.value.openPrice,
                    h(UIcon, {
                        name:
                            sortBy.value === 'openPrice'
                                ? sortDesc.value
                                    ? 'i-lucide-arrow-down-wide-narrow'
                                    : 'i-lucide-arrow-up-narrow-wide'
                                : 'i-lucide-arrow-up-down',
                        class: 'w-4 h-4 ml-1',
                    }),
                ]
            ),
        sortable: true,
        meta: addMeta(),
    },
    {
        id: 'closePrice',
        accessorKey: 'closePrice',
        header: () =>
            h(
                'button',
                {
                    class: 'flex items-center gap-1 select-none',
                    onClick: () =>
                        onSort({
                            column: { accessorKey: 'closePrice' },
                            direction: sortBy.value === 'closePrice' && !sortDesc.value ? 'desc' : 'asc',
                        }),
                },
                [
                    labelColumnsHeader.value.closePrice,
                    h(UIcon, {
                        name:
                            sortBy.value === 'closePrice'
                                ? sortDesc.value
                                    ? 'i-lucide-arrow-down-wide-narrow'
                                    : 'i-lucide-arrow-up-narrow-wide'
                                : 'i-lucide-arrow-up-down',
                        class: 'w-4 h-4 ml-1',
                    }),
                ]
            ),
        sortable: true,
        meta: addMeta(),
    },
    {
        id: 'profit',
        accessorKey: 'profit',
        header: () =>
            h(
                'button',
                {
                    class: 'flex items-center gap-1 select-none',
                    onClick: () =>
                        onSort({
                            column: { accessorKey: 'profit' },
                            direction: sortBy.value === 'profit' && !sortDesc.value ? 'desc' : 'asc',
                        }),
                },
                [
                    labelColumnsHeader.value.profit,
                    h(UIcon, {
                        name:
                            sortBy.value === 'profit'
                                ? sortDesc.value
                                    ? 'i-lucide-arrow-down-wide-narrow'
                                    : 'i-lucide-arrow-up-narrow-wide'
                                : 'i-lucide-arrow-up-down',
                        class: 'w-4 h-4 ml-1',
                    }),
                ]
            ),
        sortable: true,
        meta: addMeta(),
    },
]

const fetchTradesWrapper = async (params = {}, limit = -1) => {
    // Convertir les paramètres en tableau de filtres
    const filtersArray = Array.isArray(params) ? [...params] : []
    // Ajouter le filtre sur les trades inactifs
    await fetchTrades(filtersArray, limit, userStore.tradeOptions.showInactive)
}

onMounted(() => {
    fetchAccounts()
    fetchSymbols()
    onApplyFilters()
})

const getFilterPlaceholder = (filter: TradeFilter) => {
    if (filter.column && ['openDate', 'closeDate'].includes(filter.column)) {
        return getDatePlaceholderFormat()
    } else if (filter.column && filter.column == 'type') {
        return 'Buy/Sell'
    } else {
        return 'Valeur'
    }
}

function addFilter() {
    if (filters.value.length < 4) {
        filters.value.push({ column: 'profit', operator: OPERATOR_EQUAL, value: '' })
    }
}

function removeFilter(idx: number) {
    if (filters.value.length > 1) filters.value.splice(idx, 1)
}

function resetFilters() {
    sortBy.value = ''
    sortDesc.value = false
    page.value = 1
    filters.value = [{ column: 'symbol', operator: OPERATOR_EQUAL, value: '' }]
    onApplyFilters()
}

async function onApplyFilters() {
    tableIsLoading.value = true
    filterLoading.value = true
    try {
        // Crée une copie des filtres actuels
        let filtersForApi = [...filters.value]

        // Supprime l'ancien filtre accountId s'il existe
        filtersForApi = filtersForApi.filter((f) => f.column !== 'accountId')

        // Ajoute le filtre accountIds si des comptes sont sélectionnés
        if (userStore.tradeOptions.accountIds?.length > 0) {
            filtersForApi.push({
                column: 'accountId',
                operator: 'in',
                value: userStore.tradeOptions.accountIds,
            })
        }

        // Traite les valeurs des filtres
        filtersForApi = filtersForApi.map((filter) => {
            if (filter.column && filter.column.includes('Date') && typeof filter.value === 'string' && filter.value.trim() !== '') {
                return { ...filter, value: parseDateStringToTimestamp(filter.value) }
            } else if (filter.column === 'symbol' && typeof filter.value === 'string' && filter.value.trim() !== '') {
                return { ...filter, value: filter.value.trim().toUpperCase() }
            } else if (filter.column === 'type' && typeof filter.value === 'string' && filter.value.trim() !== '') {
                return { ...filter, value: filter.value.trim().toLowerCase() as 'buy' | 'sell' }
            } else if (filter.column === 'profit' && typeof filter.value === 'string' && filter.value.trim() !== '') {
                return { ...filter, value: parseFloat(filter.value.trim()) }
            }
            return { ...filter }
        })

        // Supprime les filtres vides
        filtersForApi = filtersForApi.filter((val) => {
            if (val.column === 'accountId' && Array.isArray(val.value)) {
                return val.value.length > 0
            }
            return val.value != undefined && val.value !== ''
        })

        await fetchTradesWrapper(filtersForApi)
        page.value = 1
    } finally {
        tableIsLoading.value = false
        filterLoading.value = false
    }
}
// Pagination et tri côté client

const sortedTrades = computed(() => {
    if (!sortBy.value) return trades.value
    return [...trades.value].sort((a, b) => {
        let valA = a[sortBy.value as keyof TradeType]
        let valB = b[sortBy.value as keyof TradeType]
        // Gestion du tri par type de colonne
        if (sortBy.value === 'openDate' || sortBy.value === 'closeDate') {
            valA = new Date(valA as string | Date).getTime()
            valB = new Date(valB as string | Date).getTime()
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortDesc.value ? (valB as string).localeCompare(valA as string) : (valA as string).localeCompare(valB as string)
        }
        if (valA == null) return 1
        if (valB == null) return -1
        if (valA === valB) return 0
        if (sortDesc.value) {
            return valA < valB ? 1 : -1
        } else {
            return valA > valB ? 1 : -1
        }
    })
})

const pageCount = computed(() => Math.max(1, Math.ceil(sortedTrades.value.length / pageSize.value)))

const paginatedTrades = computed(() => {
    const start = (page.value - 1) * pageSize.value
    const end = page.value * pageSize.value
    return sortedTrades.value.slice(start, end)
})

// Protéger contre une page hors limite
watch([page, pageCount], () => {
    if (page.value > pageCount.value) {
        page.value = pageCount.value
    }
})

function onSort({ column, direction }: { column: { accessorKey: string }; direction: string }) {
    const col = columns.find((col) => col.accessorKey === column.accessorKey)
    if (col && col.sortable === false) return
    sortBy.value = column.accessorKey as keyof TradeType
    sortDesc.value = direction === 'desc'
    page.value = 1
}

const onUndelete = async (rowid: number) => {
    await unDeleteTrade(rowid)
    onApplyFilters()
    emit('delete', rowid)
}

const onDelete = async (rowid: number) => {
    await deleteTrade(rowid)
    onApplyFilters()
    emit('delete', rowid)
}

const emit = defineEmits<{
    edit: [Value]
    delete: [rowid: number]
}>()

defineExpose({ applyFilters: onApplyFilters })

// Protéger contre une page hors limite
watch([page, pageCount], () => {
    if (page.value > pageCount.value) {
        page.value = pageCount.value
    }
})

// Vérifier que les comptes sélectionnés existent toujours
watch([() => userStore.tradeOptions.accountIds, accounts], ([currentIds, accountsList]) => {
    if (!currentIds?.length) return

    const validIds = currentIds.filter((id) => accountsList.some((account) => account.id === id))

    if (validIds.length !== currentIds.length) {
        userStore.tradeOptions.accountIds = validIds.length ? validIds : []
    }
})

// Appliquer les filtres quand les comptes changent
watch(
    () => [...(userStore.tradeOptions.accountIds || [])],
    () => {
        onApplyFilters()
    },
    { deep: true }
)
</script>
