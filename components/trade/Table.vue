<template>
    <div>
        <!-- Barre de filtres avancés -->
        <UCard class="card-container-xl">
            <template #default>
                <CommonTradeFilters :title="$t('components.trade.table.accounts.title')" slot-id="page-trade"
                        :show-plugin-slot="true" v-model:account-ids="dbStateStore.tradeOptions.accountIds"
                        v-model:show-inactive="dbStateStore.tradeOptions.showInactive" v-model:filters="filters"
                        v-model:show-advanced-filters="dbStateStore.tradeOptions.showAdvancedFilters"
                        :filter-loading="filterLoading" :account-options="accountOptions"
                        :placeholder="$t('components.trade.table.accounts.placeholder')"
                        :all-label="$t('components.trade.table.accounts.all')"
                        :selected-label="$t('components.trade.table.accounts.selected', { count: dbStateStore.tradeOptions.accountIds?.length })"
                        :show-column-visibility="true"
                        :table="table" :label-columns-header="labelColumnsHeader"
                        :exclude-columns="['actions', 'symbol', 'type', 'profit']" column-visibility-button-class="w-36"
                        :show-inactive-checkbox="true" :tag-groups="tagGroups"
                        v-model:last-filter-column="dbStateStore.tradeOptions.lastFilterColumn"
                        @apply="onApplyFiltersDebounced" @reset="resetFilters" />
            </template>
        </UCard>
        <div class="mt-4">
            <span class="text-secondary-xs ml-2">{{ $t('components.trade.table.results_count', {
                count:
                    sortedTrades.length
            })
            }}</span>
        </div>
        <div class="flex-center mb-4 items-center gap-4">
            <div v-if="paginatedTrades.length">
                <UPagination v-model:page="page" :page-count="pageCount" :total="sortedTrades.length"
                    :items-per-page="pageSize" :ui="{
                        root: '',
                        item: 'min-w-[32px] mx-[5px] !rounded-full justify-center',
                    }" />
            </div>
            <div v-if="paginatedTrades.length" class="form-row">
                <USelect v-model="dbStateStore.tradeOptions.nbLines"
                    :items="[10, 15, 20, 30, 40, 50].map((n) => ({ value: n, label: n.toString() }))" class="w-20" />
                <span class="text-sm text-gray-500 whitespace-nowrap">lignes</span>
            </div>
        </div>
        <div class="w-full">
            <CommonModalScreenshotCarousel :open="showScreenshots" :screenshots="currentScreenshots"
                @closed="showScreenshots = false" />
            <CommonModalDelete :from="'trade'" :title="$t('components.trade.table.bulk_activate_title')"
                :confirm-text="$t('common.actions.confirm')" confirm-color="primary" :open="showBulkActivateModal"
                @confirm="confirmBulkActivate" @closed="showBulkActivateModal = false">
                <template #content>
                    {{ $t('components.trade.table.bulk_activate_confirm') }}
                </template>
            </CommonModalDelete>
            <CommonModalDelete :from="'trade'" :title="$t('components.trade.table.bulk_deactivate_title')"
                :confirm-text="$t('common.actions.confirm')" confirm-color="error" :open="showBulkDeactivateModal"
                @confirm="confirmBulkDeactivate" @closed="showBulkDeactivateModal = false">
                <template #content>
                    {{ $t('components.trade.table.bulk_deactivate_confirm') }}
                </template>
            </CommonModalDelete>
            <UTable :key="timezoneKey" ref="table" v-model:column-visibility="dbStateStore.columnVisibility"
                :data="paginatedTrades" :columns="columns" :loading="tableIsLoading"
                :empty-state="{ icon: 'i-heroicons-document-text', label: $t('components.trade.table.empty_state') }"
                :ui="{ td: 'p-2' }" class="custom-table-hover table-fixed" @sort="onSort">
                <template #actions-cell="{ row }">
                    <div class="action-buttons" :class="{ 'row-inactive': row.original.active === false }">
                        <UTooltip :text="$t('components.trade.table.edit_button')">
                            <UButton icon="i-heroicons-pencil-square" size="xs" color="primary" variant="ghost"
                                @click="$emit('edit', row.original)">{{ $t('components.trade.table.edit_button') }}
                            </UButton>
                        </UTooltip>
                        <CommonModalDelete v-if="row.original.active === false" :from="'trade'"
                            :title="$t('components.trade.table.activate_title')"
                            :confirm-text="$t('common.actions.confirm')" confirm-color="primary"
                            @confirm="onUndelete(row.original.id!)">
                            <template #trigger>
                                <UTooltip :text="$t('components.trade.table.activate_button')">
                                    <UButton icon="i-lucide-archive-restore" size="xs" color="primary" variant="ghost">
                                    </UButton>
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
                <template #stopLoss-cell="{ row }">
                    <span class="font-semibold">
                        {{ !row.original.stopLoss ? '---' :
                            row.original.stopLoss.toFixed(getDigitFromSymbol(row.original.symbol)) }}
                    </span>
                </template>
                <template #takeProfit-cell="{ row }">
                    <span class="font-semibold">
                        {{ !row.original.takeProfit ? '---' :
                            row.original.takeProfit.toFixed(getDigitFromSymbol(row.original.symbol)) }}
                    </span>
                </template>
                <template #profit-cell="{ row }">
                    <span :class="(row.original.netProfit || 0) >= 0 ? 'profit-text' : 'loss-text'">
                        {{ formatCurrency(row.original.netProfit || 0) }}
                    </span>
                </template>
                <template #grossProfit-cell="{ row }">
                    <span :class="(row.original.profit || 0) >= 0 ? 'profit-text' : 'loss-text'">
                        {{ formatCurrency(row.original.profit || 0) }}
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
                <UPagination v-model:page="page" :page-count="pageCount" :total="sortedTrades.length"
                    :items-per-page="pageSize" :ui="{
                        root: '',
                        item: 'min-w-[32px] mx-[5px] !rounded-full justify-center',
                    }" />
            </div>
            <div v-if="paginatedTrades.length" class="form-row">
                <USelect v-model="dbStateStore.tradeOptions.nbLines"
                    :items="[10, 15, 20, 30, 40, 50].map((n) => ({ value: n, label: n.toString() }))" class="w-20" />
                <span class="text-sm text-gray-500 whitespace-nowrap">lignes</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { TradeType } from '~/schema/trade'
import type { TradeFilter } from '~/type'
import { UIcon } from '#components'
import { OPERATOR_EQUAL } from '~/utils'
import { formatDateWithUserTimezone, formatDateString } from '~/utils/date-utils'
import { transformAdvancedFilters } from '~/utils/filter-utils'
import type { Value } from '@prisma/client/runtime/library'
import { defaultSettings } from '~/schema/user'

const appConfig = useAppConfig()
const { formatCurrency } = useUtils()
const colorMode = useColorMode()
const userStore = useUserStore()
const dbStateStore = useDbStateStore()

const tableRowHoverColor = computed(() => {
    const colors = userStore.user?.settings_object?.chartColors?.tableRowHover || defaultSettings.chartColors!.tableRowHover
    const theme = colorMode.value as 'light' | 'dark' | 'light-blue' | 'dark-gold'
    return colors[theme] || colors.light
})

const UTooltipComp = resolveComponent('UTooltip')

const UButtonComp = resolveComponent('UButton')

const { t, locale } = useI18n()
const { trades, fetchTrades, deleteTrade, unDeleteTrade } = useTrades()
const { getDigitFromSymbol } = useSymbols()
const { accounts, fetchAccounts } = useAccount()
const { tradeTypeColors } = useTypeColors()

const pageSize = computed(() => dbStateStore.tradeOptions.nbLines)
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
const { tagGroups, fetchGroups } = useTags()

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
        stopLoss: t('components.common.columns.headers.stopLoss'),
        takeProfit: t('components.common.columns.headers.takeProfit'),
        instrumentType: t('components.common.columns.headers.instrumentType'),
        // Index signature is added via the type assertion below
    }
})

const filters = computed({
    get: () => dbStateStore.tradeOptions.filters || [{ column: 'symbol', operator: OPERATOR_EQUAL, value: '' }],
    set: (val) => dbStateStore.tradeOptions.filters = val
})

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
                                    'hover:text-primary',
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
        id: 'instrumentType',
        accessorKey: 'instrumentType',
        header: () => t('components.common.columns.headers.instrumentType'),
        cell: ({ row }) => {
            const val = row.original.instrumentType
            if (!val) return ''
            return val.charAt(0).toUpperCase() + val.slice(1)
        },
        sortable: true,
        meta: addMeta('w-[120px]'),
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
        cell: ({ row }) => formatDateString(row.getValue('openDate'), true, locale as 'fr' | 'en' | 'us'),
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
        cell: ({ row }) => formatDateString(row.getValue('closeDate'), true, locale as 'fr' | 'en' | 'us'),
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
    {
        id: 'stopLoss',
        accessorKey: 'stopLoss',
        header: () => t('components.common.columns.headers.stopLoss'),
        sortable: false,
        meta: addMeta('w-[100px]'),
    },
    {
        id: 'takeProfit',
        accessorKey: 'takeProfit',
        header: () => t('components.common.columns.headers.takeProfit'),
        sortable: false,
        meta: addMeta('w-[100px]'),
    },
]

const fetchTradesWrapper = async (params = {}, limit = 1000) => {
    // Convertir les paramètres en tableau de filtres
    const filtersArray = Array.isArray(params) ? [...params] : []
    // Ajouter le filtre sur les trades inactifs
    await fetchTrades(filtersArray, limit, dbStateStore.tradeOptions.showInactive)
}

const onApplyFiltersDebounced = useDebounce(onApplyFilters, 200, { leading: true })

onMounted(() => {
    fetchAccounts()
    fetchGroups()
    onApplyFiltersDebounced()
})


function resetFilters() {
    sortBy.value = ''
    sortDesc.value = false
    page.value = 1
    filters.value = []
    dbStateStore.tradeOptions.showAdvancedFilters = false
    onApplyFiltersDebounced()
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
        if (dbStateStore.tradeOptions.accountIds?.length > 0) {
            filtersForApi.push({
                column: 'accountId',
                operator: 'in',
                value: dbStateStore.tradeOptions.accountIds,
            })
        }

        // Traite les valeurs des filtres
        filtersForApi = transformAdvancedFilters(filtersForApi)

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

defineExpose({ applyFilters: onApplyFiltersDebounced })

// Protéger contre une page hors limite
watch([page, pageCount], () => {
    if (page.value > pageCount.value) {
        page.value = pageCount.value
    }
})

usePageDataManager({
    fetchFn: onApplyFilters,
    accounts,
    getAccountIds: () => dbStateStore.tradeOptions.accountIds,
    setAccountIds: (ids) => { dbStateStore.tradeOptions.accountIds = ids },
})

// Appliquer les filtres quand les comptes changent
watch(
    () => [...(dbStateStore.tradeOptions.accountIds || [])],
    () => {
        onApplyFiltersDebounced()
    },
    { deep: true }
)

// Appliquer les filtres quand showInactive change
watch(
    () => dbStateStore.tradeOptions.showInactive,
    () => {
        onApplyFiltersDebounced()
    }
)
</script>


<style scoped>
.custom-table-hover :deep(tbody tr:hover) {
    background-color: v-bind('tableRowHoverColor');
}
</style>
