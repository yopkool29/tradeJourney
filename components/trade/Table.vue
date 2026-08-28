<template>
    <div>
        <!-- Barre de filtres avancés -->
        <UCard class="card-container-xl">
            <template #default>
                <CommonTradeFilters
                        v-model:account-ids="dbStateStore.tradeOptions.accountIds"
                        v-model:show-inactive="dbStateStore.tradeOptions.showInactive"
                        v-model:filters="filters"
                        v-model:show-advanced-filters="dbStateStore.tradeOptions.showAdvancedFilters"
                        v-model:last-filter-column="dbStateStore.tradeOptions.lastFilterColumn"
                        :title="$t('components.trade.table.accounts.title')" slot-id="page-trade"
                        :show-plugin-slot="true"
                        :filter_loading="filterLoading" :account-options="accountOptions"
                        :placeholder="$t('components.trade.table.accounts.placeholder')"
                        :all-label="$t('components.trade.table.accounts.all')"
                        :selected-label="$t('components.trade.table.accounts.selected', { count: dbStateStore.tradeOptions.accountIds?.length })"
                        :show-column-visibility="true"
                        :table="table" :label-columns-header="labelColumnsHeader"
                        :exclude-columns="['actions', 'symbol', 'type', 'profit']" column-visibility-button-class="w-36"
                        :show-inactive-checkbox="true" :tag-groups="tagGroups"
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
                <span class="text-sm text-muted whitespace-nowrap">lignes</span>
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
                        <UButton icon="i-heroicons-pencil-square" size="xs" color="primary" variant="ghost"
                            :title="$t('components.trade.table.edit_button')"
                            @click="$emit('edit', row.original)">{{ $t('components.trade.table.edit_button') }}
                        </UButton>
                        <CommonModalDelete v-if="row.original.active === false" :from="'trade'"
                            :title="$t('components.trade.table.activate_title')"
                            :confirm-text="$t('common.actions.confirm')" confirm-color="primary"
                            @confirm="onUndelete(row.original.id!)">
                            <template #trigger>
                                <UButton icon="i-lucide-archive-restore" size="xs" color="primary" variant="ghost"
                                    :title="$t('components.trade.table.activate_button')">
                                </UButton>
                            </template>
                            <template #content>{{ $t('components.trade.table.activate_confirm') }}</template>
                        </CommonModalDelete>
                        <CommonModalDelete v-else :from="'trade'" @confirm="onDelete(row.original.id!)">
                            <template #trigger>
                                <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost"
                                    :title="$t('components.trade.table.deactivate_button')"></UButton>
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
                <span class="text-sm text-muted whitespace-nowrap">lignes</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { UIcon } from '#components'
import { formatDateWithUserTimezone, formatDateString } from '~/utils/date-utils'
import { getTradeColumnHeaders } from '~/utils/tradeColumnHeaders'
import type { Value } from '@prisma/client/runtime/library'
import { defaultSettings } from '~/schema/user'
import { useTradeTableFilters } from '~/composables/trades/useTradeTableFilters'

const { formatCurrency } = useUtils()
const colorMode = useColorMode()
const userStore = useUserStore()
const dbStateStore = useDbStateStore()

const tableRowHoverColor = computed(() => {
    const colors = userStore.user?.settings_object?.chartColors?.tableRowHover || defaultSettings.chartColors!.tableRowHover
    const theme = colorMode.value as 'light' | 'dark' | 'light-blue' | 'dark-gold'
    return colors[theme] || colors.light
})

const UButtonComp = resolveComponent('UButton')

const { t, locale } = useI18n()
const { labelColumnsHeader } = getTradeColumnHeaders()
const { accounts, fetchAccounts } = useAccount()
const { tradeTypeColors } = useTypeColors()
const { getDigitFromSymbol } = useSymbols()
const { tagGroups, fetchGroups } = useTags()

const {
    page, pageSize, sortBy, sortDesc,
    tableIsLoading, filterLoading,
    filters, sortedTrades, pageCount, paginatedTrades,
    onSort, resetFilters: resetFiltersBase, onApplyFilters,
    confirmBulkActivate, confirmBulkDeactivate,
    onUndelete: onUndeleteBase, onDelete: onDeleteBase,
} = useTradeTableFilters()

const table = useTemplateRef('table')
// Clé réactive pour forcer le re-rendu quand les settings de timezone changent
const timezoneKey = computed(() => {
    const settings = userStore.user?.settings_object
    return `${settings?.timezoneDisplay}-${settings?.timezoneLocal}-${settings?.timezoneUtcOffset}`
})
const showScreenshots = ref(false)
const currentScreenshots = ref<Array<{ id?: number; url: string }>>([])
const showBulkActivateModal = ref(false)
const showBulkDeactivateModal = ref(false)

const accountOptions = computed(() => {
    return accounts.value.map((account) => {
        return { label: account.displayName, value: account.id }
    })
})

const addMeta = (defaultClass: string = 'w-[80px]') => {
    return { class: { td: defaultClass } }
}

const openScreenshotsModal = (screenshots: Array<{ id?: number; url: string }>) => {
    currentScreenshots.value = screenshots
    showScreenshots.value = true
}

const sortableHeader = (label: string, accessorKey: string) => () => h(
    'button',
    {
        class: 'flex items-center gap-1 select-none',
        onClick: () => onSort({
            column: { accessorKey },
            direction: sortBy.value === accessorKey && !sortDesc.value ? 'desc' : 'asc',
        }),
    },
    [
        label,
        h(UIcon, {
            name: sortBy.value === accessorKey
                ? sortDesc.value ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide'
                : 'i-lucide-arrow-up-down',
            class: 'w-4 h-4 ml-1',
        }),
    ],
)

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
                    UButtonComp,
                    {
                        variant: 'ghost',
                        color: 'neutral',
                        icon: 'i-heroicons-photo',
                        title:
                            allScreenshots.length > 1
                                ? t('components.common.columns.screenshots.multiple', { count: allScreenshots.length })
                                : t('components.common.columns.screenshots.single'),
                        class: [
                            'text-muted',
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
        header: sortableHeader(labelColumnsHeader.value.symbol, 'symbol'),
        sortable: true,
        meta: addMeta(),
    },
    {
        id: 'account',
        accessorKey: 'account',
        header: sortableHeader(labelColumnsHeader.value.account, 'account'),
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
        header: sortableHeader(labelColumnsHeader.value.openDate, 'openDate'),
        cell: ({ row }) => formatDateString(row.getValue('openDate'), true, locale as 'fr' | 'en' | 'us'),
        sortable: true,
        meta: addMeta('w-[150px]'),
    },
    {
        id: 'closeDate',
        accessorKey: 'closeDate',
        header: sortableHeader(labelColumnsHeader.value.closeDate, 'closeDate'),
        cell: ({ row }) => formatDateString(row.getValue('closeDate'), true, locale as 'fr' | 'en' | 'us'),
        sortable: true,
        meta: addMeta('w-[150px]'),
    },
    {
        id: 'type',
        accessorKey: 'type',
        header: sortableHeader(labelColumnsHeader.value.type, 'type'),
        sortable: true,
        meta: addMeta(),
    },
    {
        id: 'lot',
        accessorKey: 'lot',
        header: sortableHeader(labelColumnsHeader.value.lot, 'lot'),
        sortable: true,
        meta: addMeta(),
    },
    {
        id: 'openPrice',
        accessorKey: 'openPrice',
        header: sortableHeader(labelColumnsHeader.value.openPrice, 'openPrice'),
        sortable: true,
        meta: addMeta(),
    },
    {
        id: 'closePrice',
        accessorKey: 'closePrice',
        header: sortableHeader(labelColumnsHeader.value.closePrice, 'closePrice'),
        sortable: true,
        meta: addMeta(),
    },
    {
        id: 'profit',
        accessorKey: 'netProfit',
        header: sortableHeader(labelColumnsHeader.value.profit, 'netProfit'),
        sortable: true,
        meta: addMeta(),
    },
    {
        id: 'grossProfit',
        accessorKey: 'profit',
        header: sortableHeader(labelColumnsHeader.value.grossProfit, 'profit'),
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
    {
        id: 'riskReward',
        header: () => t('components.common.columns.headers.riskReward'),
        cell: ({ row }) => {
            const metadata = row.original.metadata as Record<string, unknown> | null | undefined
            const storedValue = metadata?.riskReward as number | undefined
            if (storedValue === undefined || storedValue === null || storedValue === 0) return '---'
            const value = Number(storedValue)
            if (isNaN(value)) return '---'
            const formatted = value.toFixed(2)
            if (value < 0) {
                return h('span', { class: 'text-red-500 dark:text-red-400' }, formatted)
            }
            return formatted
        },
        sortable: false,
        meta: addMeta('w-[80px]'),
    },
]

const onApplyFiltersDebounced = useDebounce(onApplyFilters, 200, { leading: true })

const emit = defineEmits<{
    edit: [Value]
    delete: [rowid: number]
}>()

const resetFilters = () => resetFiltersBase(onApplyFiltersDebounced)

const onUndelete = (rowid: number) => onUndeleteBase(rowid, emit)
const onDelete = (rowid: number) => onDeleteBase(rowid, emit)

onMounted(() => {
    fetchAccounts()
    fetchGroups()
    onApplyFiltersDebounced()
})

defineExpose({ applyFilters: onApplyFiltersDebounced })

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
