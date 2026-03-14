<template>
    <div>
        <!-- Barre de filtres avancés -->
        <UCard class="card-container-xl">
            <template #default>
                <div class="filter-container">
                    <div class="section-label">{{ $t('components.trade.table.accounts.title') }}</div>
                    <div class="action-buttons">
                        <USelect
                            v-model="userStore.tradeOptions.accountIds"
                            :items="accountOptions"
                            :placeholder="$t('components.trade.table.accounts.placeholder')"
                            multiple
                            size="lg"
                            class="select-standard"
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

                <div class="flex flex-col gap-y-4">

                    <CommonAdvancedFilters
                        v-model="filters"
                        :columns="filterableColumnsConfig"
                        :loading="filterLoading"
                        @add="addFilter"
                        @remove="removeFilter"
                        @apply="onApplyFilters"
                        @reset="resetFilters"
                    >
                        <template #field-type="{ filter, onValueChange }">
                            <USelect
                                :model-value="filter.value as string"
                                :items="[
                                    { label: 'Buy', value: 'buy' },
                                    { label: 'Sell', value: 'sell' },
                                ]"
                                placeholder="Buy/Sell"
                                class="min-w-[200px]"
                                @update:model-value="onValueChange"
                            />
                        </template>
                    </CommonAdvancedFilters>
                    
                    <div class="filter-actions justify-start">
                        <ColumnVisibilityMenu
                            :table="table"
                            :label-columns-header="labelColumnsHeader"
                            :exclude-columns="['actions', 'symbol', 'type', 'profit']"
                            button-class="w-36"
                        />
                    </div>
                </div>
            </template>
        </UCard>
        <div class="filter-actions mb-2">
            <span class="text-secondary-xs ml-2">{{ $t('components.trade.table.results_count', { count: sortedTrades.length }) }}</span>
        </div>
        <div class="flex-center mb-4 items-center gap-4">
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
            <div v-if="paginatedTrades.length" class="form-row">
                <USelect
                    v-model="userStore.tradeOptions.nbLines"
                    :items="[10, 15, 20, 30, 40, 50].map((n) => ({ value: n, label: n.toString() }))"
                    class="w-20"
                />
                <span class="text-sm text-gray-500 whitespace-nowrap">lignes</span>
            </div>
        </div>
        <div class="w-full">
            <CommonModalScreenshotCarousel :open="showScreenshots" :screenshots="currentScreenshots" @closed="showScreenshots = false" />
            <CommonModalDelete
                :from="'trade'"
                :title="$t('components.trade.table.bulk_activate_title')"
                :confirm-text="$t('common.actions.confirm')"
                confirm-color="primary"
                :open="showBulkActivateModal"
                @confirm="confirmBulkActivate"
                @closed="showBulkActivateModal = false"
            >
                <template #content>
                    {{ $t('components.trade.table.bulk_activate_confirm') }}
                </template>
            </CommonModalDelete>
            <CommonModalDelete
                :from="'trade'"
                :title="$t('components.trade.table.bulk_deactivate_title')"
                :confirm-text="$t('common.actions.confirm')"
                confirm-color="error"
                :open="showBulkDeactivateModal"
                @confirm="confirmBulkDeactivate"
                @closed="showBulkDeactivateModal = false"
            >
                <template #content>
                    {{ $t('components.trade.table.bulk_deactivate_confirm') }}
                </template>
            </CommonModalDelete>
            <UTable
                :key="timezoneKey"
                ref="table"
                v-model:column-visibility="userStore.columnVisibility"
                :data="paginatedTrades"
                :columns="columns"
                :loading="tableIsLoading"
                :empty-state="{ icon: 'i-heroicons-document-text', label: $t('components.trade.table.empty_state') }"
                :ui="{ td: 'p-2' }"
                class="custom-table-hover table-fixed"
                @sort="onSort"
            >
                <template #actions-cell="{ row }">
                    <div class="action-buttons" :class="{ 'row-inactive': row.original.active === false }">
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
                    {{ formatDateWithUserTimezone(row.original.openDate, userStore.user?.settings_object, true, locale as 'fr' | 'en' | 'us') }}
                </template>
                <template #closeDate-cell="{ row }">
                    {{ formatDateWithUserTimezone(row.original.closeDate, userStore.user?.settings_object, true, locale as 'fr' | 'en' | 'us') }}
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
                    <span :class="(row.original.netProfit || 0) >= 0 ? 'profit-text' : 'loss-text'">
                        {{ formatCurrency(row.original.netProfit || 0) }}
                    </span>
                </template>
                <template #type-cell="{ row }">
                    <UBadge size="md" :style="{ backgroundColor: tradeTypeColors[row.original.type], color: 'white' }">
                        {{ row.original.type === 'buy' ? $t('common.trade_types.buy') : $t('common.trade_types.sell') }}
                    </UBadge>
                </template>
            </UTable>
        </div>
        <div v-if="!paginatedTrades.length && !tableIsLoading">
            <div class="py-8 text-center text-secondary">
                <div class="text-lg mb-2">{{ $t('components.trade.table.no_trades.title') }}</div>
                <div class="text-sm">{{ $t('components.trade.table.no_trades.description') }}</div>
            </div>
        </div>
        <div class="flex-center mt-4 items-center gap-4">
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
            <div v-if="paginatedTrades.length" class="form-row">
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
    OPERATOR_GREATER_THAN_OR_EQUAL,
} from '~/utils'
import { formatDateWithUserTimezone, parseDateStringToTimestamp } from '~/utils/date-utils'
import type { Value } from '@prisma/client/runtime/library'

const appConfig = useAppConfig()
const { formatCurrency } = useUtils()

const UTooltipComp = resolveComponent('UTooltip')

const UButtonComp = resolveComponent('UButton')

const { t, locale } = useI18n()
const { trades, fetchTrades, deleteTrade, unDeleteTrade } = useTrades()
const { fetchSymbols, getDigitFromSymbol } = useSymbols()
const { accounts, fetchAccounts } = useAccount()
const userStore = useUserStore()
const { tradeTypeColors } = useTypeColors()

const pageSize = computed(() => userStore.tradeOptions.nbLines)
const page = ref(1)

const sortBy = ref<keyof TradeType | ''>('')
const sortDesc = ref(false)

// Clé réactive pour forcer le re-rendu quand les settings de timezone changent
const timezoneKey = computed(() => {
    const settings = userStore.user?.settings_object
    return `${settings?.timezoneDisplay}-${settings?.timezoneLocal}-${settings?.timezoneUtcOffset}`
})

const tableIsLoading = ref(false)
const filterLoading = ref(false)
const table = useTemplateRef('table')
// État pour gérer l'affichage de la modal de captures d'écran
const showScreenshots = ref(false)
const currentScreenshots = ref<Array<{ id?: number; url: string }>>([])
// État pour gérer l'activation/désactivation groupée
const showBulkActivateModal = ref(false)
const showBulkDeactivateModal = ref(false)

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
        grossProfit: t('components.common.columns.headers.grossProfit'),
        commission: t('components.common.columns.headers.commission'),
        // Index signature is added via the type assertion below
    }
})

// Configuration des colonnes filtrables pour CommonAdvancedFilters
const filterableColumnsConfig = computed(() => [
    { 
        label: t('components.trade.table.filters.openDate'), 
        value: 'openDate',
        type: 'date' as const
    },
    { 
        label: t('components.trade.table.filters.closeDate'), 
        value: 'closeDate',
        type: 'date' as const
    },
    { 
        label: t('components.trade.table.filters.symbol'), 
        value: 'symbol',
        operators: [OPERATOR_EQUAL],
        defaultOperator: OPERATOR_EQUAL
    },
    { 
        label: t('components.trade.table.filters.type'), 
        value: 'type',
        type: 'select' as const,
        operators: [OPERATOR_EQUAL],
        defaultOperator: OPERATOR_EQUAL,
        defaultValue: 'buy'
    },
    { 
        label: t('components.trade.table.filters.lot'), 
        value: 'lot',
        type: 'number' as const
    },
    { 
        label: t('components.trade.table.filters.openPrice'), 
        value: 'openPrice',
        type: 'number' as const
    },
    { 
        label: t('components.trade.table.filters.closePrice'), 
        value: 'closePrice',
        type: 'number' as const
    },
    { 
        label: t('components.trade.table.filters.profit'), 
        value: 'profit',
        type: 'number' as const,
        defaultOperator: OPERATOR_GREATER_THAN_OR_EQUAL
    },
])

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
        header: () =>
            h(
                'div',
                {
                    class: 'flex items-center gap-1',
                },
                [
                    labelColumnsHeader.value.actions,
                    h(UButtonComp, {
                        icon: 'i-lucide-archive-restore',
                        size: 'xs',
                        color: 'primary',
                        variant: 'ghost',
                        onClick: () => showBulkActivateModal.value = true,
                    }),
                    h(UButtonComp, {
                        icon: 'i-heroicons-trash',
                        size: 'xs',
                        color: 'error',
                        variant: 'ghost',
                        onClick: () => showBulkDeactivateModal.value = true,
                    }),
                ]
            ),
        meta: addMeta(),
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
        accessorKey: 'netProfit',
        header: () =>
            h(
                'button',
                {
                    class: 'flex items-center gap-1 select-none',
                    onClick: () =>
                        onSort({
                            column: { accessorKey: 'netProfit' },
                            direction: sortBy.value === 'netProfit' && !sortDesc.value ? 'desc' : 'asc',
                        }),
                },
                [
                    labelColumnsHeader.value.profit,
                    h(UIcon, {
                        name:
                            sortBy.value === 'netProfit'
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
        id: 'grossProfit',
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
                    labelColumnsHeader.value.grossProfit,
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
        cell: ({ row }) => formatCurrency(row.original.profit || 0),
        sortable: true,
        meta: addMeta('w-[100px]'),
    },
    {
        id: 'commission',
        accessorKey: 'commission',
        header: () => t('components.common.columns.headers.commission'),
        cell: ({ row }) => formatCurrency(row.original.commission || 0),
        sortable: false,
        meta: addMeta('w-[100px]'),
    },
]

const fetchTradesWrapper = async (params = {}, limit = 1000) => {
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

function addFilter() {
    if (filters.value.length < 4) {
        filters.value.push({ column: 'profit', operator: OPERATOR_GREATER_THAN_OR_EQUAL, value: '' })
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

const confirmBulkActivate = async () => {
    const inactiveTrades = paginatedTrades.value.filter(trade => trade.active === false)
    const tradeIds = inactiveTrades.map(t => t.id!)
    
    // Faire tous les appels API en parallèle
    await Promise.all(tradeIds.map(id => unDeleteTrade(id)))
    
    // Mettre à jour le state en une seule fois
    tradeIds.forEach(id => {
        const tradeInList = trades.value.find(t => t.id === id)
        if (tradeInList) {
            tradeInList.active = true
        }
    })
    
    showBulkActivateModal.value = false
}

const confirmBulkDeactivate = async () => {
    const activeTrades = paginatedTrades.value.filter(trade => trade.active !== false)
    const tradeIds = activeTrades.map(t => t.id!)
    
    // Faire tous les appels API en parallèle
    await Promise.all(tradeIds.map(id => deleteTrade(id)))
    
    // Mettre à jour le state en une seule fois
    tradeIds.forEach(id => {
        const tradeInList = trades.value.find(t => t.id === id)
        if (tradeInList) {
            tradeInList.active = false
        }
    })
    
    showBulkDeactivateModal.value = false
}

const onUndelete = async (rowid: number) => {
    await unDeleteTrade(rowid)
    // Mettre à jour uniquement la ligne concernée au lieu de recharger toute la table
    const trade = trades.value.find(t => t.id === rowid)
    if (trade) {
        trade.active = true
    }
    emit('delete', rowid)
}

const onDelete = async (rowid: number) => {
    await deleteTrade(rowid)
    // Mettre à jour uniquement la ligne concernée au lieu de recharger toute la table
    const trade = trades.value.find(t => t.id === rowid)
    if (trade) {
        trade.active = false
    }
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


<style scoped>
:not(.dark) .custom-table-hover :deep(tbody tr:hover) {
    background-color: v-bind('appConfig.charts.colors.tableRowHover.light');
}

.dark .custom-table-hover :deep(tbody tr:hover) {
    background-color: v-bind('appConfig.charts.colors.tableRowHover.dark');
}
</style>
