<template>
    <div>
        <UCard class="card-container-xl">
            <template #default>
                <CommonTradeFilters
                    :title="$t('components.dashboard.index.accounts')"
                    slot-id="page-dashboard"
                    :show-plugin-slot="true"
                    v-model:account-ids="userStore.dashBoardFilters.accountIds"
                    v-model:show-inactive="userStore.dashBoardFilters.showInactive"
                    v-model:filters="filters"
                    v-model:show-advanced-filters="userStore.dashBoardFilters.showAdvancedFilters"
                    :filter-loading="filterLoading"
                    :account-options="accountOptions"
                    :placeholder="$t('components.dashboard.index.select_accounts')"
                    :all-label="$t('components.dashboard.index.all_accounts')"
                    :selected-label="$t('components.dashboard.index.selected_accounts', { count: userStore.dashBoardFilters.accountIds?.length })"
                    :filterable-columns-config="filterableColumnsConfig"
                    :show-inactive-checkbox="false"
                    :tag-groups="tagGroups"
                    v-model:last-filter-column="userStore.dashBoardFilters.lastFilterColumn"
                    @apply="onApplyFiltersDebounced"
                    @reset="resetFilters"
                >
                    <template #after-accounts>
                        <div class="filter-actions-lg">
                            <USelect class="w-auto select-none select-standard" :ui="{ content: 'w-auto min-w-[var(--reka-select-trigger-width)]' }" v-model="userStore.dashBoardFilters.period" :items="periodOptions(locale)"
                                :placeholder="$t('components.dashboard.index.period')"/>
                            <UInput v-model="startDateStr" type="date" class="date-input" />
                            <UInput v-model="endDateStr" type="date" class="date-input" />
                        </div>
                        <!-- Ligne d'options avancées -->
                        <div class="">
                            <div class="form-row">
                                <label for="cumule-mode-select" class="font-medium">{{ $t('components.dashboard.index.aggregation')
                                    }}</label>
                                <USelect id="cumule-mode-select" v-model="userStore.dashBoardFilters.cumuleMode"
                                    :items="cumuleOptions" class="min-w-[120px] max-w-[200px] w-full"
                                    @update:model-value="onApplyFiltersDebounced" />
                            </div>
                        </div>
                    </template>
                </CommonTradeFilters>
            </template>
        </UCard>

        <div class="flex flex-col gap-4 max-w-5xl mb-8">

            <!-- Overview : Cards (Nuxt UI) -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.trades_count') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.trades_count_tooltip')" :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ dashBoardResult.tradesCount }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.cumulated_pnl') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.cumulated_pnl_tooltip')"
                        :ui="{ content: 'text-sm' }" class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ formatCurrency(dashBoardResult.pnl) }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.expectancy') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.expectancy_tooltip')" :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ formatCurrency(dashBoardResult.appt) }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.pl_ratio') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.pl_ratio_tooltip')" :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ dashBoardResult.plRatio?.toFixed(2) }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.win_rate') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.win_rate_tooltip')" :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ dashBoardResult.winrate?.toFixed(2) }}%</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.profit_factor') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.profit_factor_tooltip')"
                        :ui="{ content: 'text-sm' }" class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ formatValue(dashBoardResult.profitFactor)
                            }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.recovery_factor') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.recovery_factor_tooltip')"
                        :ui="{ content: 'text-sm' }" class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ formatValue(dashBoardResult.recoveryFactor)
                            }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.sharpe_ratio') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.sharpe_ratio_tooltip')" :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ dashBoardResult.sharpeRatio?.toFixed(2)
                            }}</span>
                    </UTooltip>
                </div>
            </div>
        </div>
        
        <!-- Graphiques -->
        <div v-if="chartsReady" class="mb-8">
            <div class="flex justify-start mb-2">
                <DashboardChartVisibilityMenu v-model="chartVisibility" />
            </div>
            <CommonDraggableGrid :items="chartItems" :shared-props="{ loading: filterLoading }" @update:order="onChartOrderChange" />
        </div>

        <!-- 4 Sections principales : ALL / PROFIT / LOSING / COMPARISON -->
        <div v-if="chartsReady" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <DashboardAllTradesSection />
            <DashboardProfitTradesSection />
            <DashboardLosingTradesSection />
            <DashboardWinLossComparisonSection />
        </div>
    </div>
</template>

<script setup lang="ts">
import { periodOptions, getPeriodDates } from '~/utils/dashboard'
import type { AccountType } from '~/schema/account'
import type { SettingsContentType } from '~/schema/user'
import { formatDateToYYYYMMDD } from '~/utils/date-utils'
import { metadataHelpers } from '~/utils'
import type { TradeFilter, FilterColumn, ChartKey } from '~/type'
import {
    OPERATOR_EQUAL,
    OPERATOR_NOT_EQUAL,
    OPERATOR_GREATER_THAN_OR_EQUAL,
    OPERATOR_IN,
} from '~/utils'
import DashboardPnlBarChart from './PnlBarChart.vue'
import DashboardCumulatedPnlChart2 from './CumulatedPnlChart2.vue'
import DashboardApptChart from './ApptChart.vue'
import DashboardWinrateChart from './WinrateChart.vue'

const { formatCurrency } = useUtils()

const userStore = useUserStore()
const settings = userStore.user?.settings_object as SettingsContentType
const { fetchAccounts, fetchData, accounts, dashBoardLastTrades, dashBoardResult, clearLastTrades } = useDashboard()
const { displayModeNet } = useNetGrossDisplay()
const { tagGroups } = useTags()
const chartsReady = ref(false)
const { t, locale } = useI18n()

const chartVisibility = computed({
    get: () => {
        const saved = userStore.dashBoardFilters.dashboardChartVisibility
        const defaultVisibility = { pnlBar: true, cumulatedPnl: true, appt: true, winrate: true }
        return saved ? { ...defaultVisibility, ...saved } : defaultVisibility
    },
    set: (val) => {
        userStore.dashBoardFilters = { ...userStore.dashBoardFilters, dashboardChartVisibility: val }
    }
})

const chartOrder = computed((): ChartKey[] => userStore.dashBoardFilters.dashboardChartOrder || ['pnlBar', 'cumulatedPnl', 'appt', 'winrate'])

const chartItems = computed(() => {
    const componentMap: Record<ChartKey, any> = {
        pnlBar: DashboardPnlBarChart,
        cumulatedPnl: DashboardCumulatedPnlChart2,
        appt: DashboardApptChart,
        winrate: DashboardWinrateChart
    }

    return chartOrder.value
        .filter((id: ChartKey) => chartVisibility.value[id])
        .map((id: ChartKey) => ({
            id,
            component: componentMap[id],
            props: id === 'cumulatedPnl' ? { startingCapital: startingCapital.value } : undefined
        }))
})

const onChartOrderChange = (newOrder: string[]) => {
    userStore.dashBoardFilters.dashboardChartOrder = newOrder as ChartKey[]
}

const formatValue = (value: number | undefined, decimals: number = 2): string => {
    if (value === undefined || value === null) return '---'
    if (!isFinite(value)) return '---'
    return value.toFixed(decimals)
}

const cumuleOptions = computed(() => [
    { label: t('components.dashboard.index.by_day'), value: 'day' },
    { label: t('components.dashboard.index.by_week'), value: 'week' },
    { label: t('components.dashboard.index.by_month'), value: 'month' },
])

const accountOptions = computed(() => {
    return accounts.value.map((account) => {
        return {
            value: account.id,
            label: account.displayName,
        }
    })
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
        operators: [OPERATOR_EQUAL, OPERATOR_NOT_EQUAL, OPERATOR_IN],
        defaultOperator: OPERATOR_EQUAL
    },
    {
        label: t('components.trade.table.filters.type'),
        value: 'type',
        type: 'select' as const,
        operators: [OPERATOR_EQUAL, OPERATOR_NOT_EQUAL],
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
    {
        label: t('components.trade.table.filters.tags'),
        value: 'tags',
        type: 'number' as const,
        operators: [OPERATOR_IN],
        defaultOperator: OPERATOR_IN
    },
])

const filters = computed({
    get: () => userStore.dashBoardFilters.filters || [{ column: 'symbol', operator: OPERATOR_EQUAL, value: '' }],
    set: (val) => userStore.dashBoardFilters.filters = val
})


// Calculer le capital de départ en additionnant les capitaux des comptes sélectionnés
const startingCapital = computed(() => {
    const selectedAccountIds = userStore.dashBoardFilters.accountIds

    // Filtrer les comptes sélectionnés qui existent réellement
    let availableAccounts = accounts.value
    if (selectedAccountIds && selectedAccountIds.length > 0) {
        availableAccounts = accounts.value.filter(acc => selectedAccountIds.includes(acc.id))
    }

    // Additionner les capitaux de départ de tous les comptes disponibles
    let totalCapital = 0

    for (const account of availableAccounts) {
        const capital = metadataHelpers.get<number>(account.metadata, 'startingCapital')
        if (capital !== null && capital !== undefined) {
            totalCapital += capital
        }
        else {
            return null
        }
    }

    // Retourner le total si au moins un compte a un capital, sinon null
    return totalCapital
})

const startDateStr = computed({
    get: () => formatDateToYYYYMMDD(userStore.dashBoardFilters.startDate),
    set: (value) => {
        const newDate = new Date(value)
        userStore.dashBoardFilters.startDate = newDate
        userStore.dashBoardFilters.customStartDate = newDate
        // Passer en mode custom si on modifie manuellement la date
        if (userStore.dashBoardFilters.period !== 'custom') {
            userStore.dashBoardFilters.period = 'custom'
        }
    },
})

const endDateStr = computed({
    get: () => formatDateToYYYYMMDD(userStore.dashBoardFilters.endDate),
    set: (value) => {
        const newDate = new Date(value)
        userStore.dashBoardFilters.endDate = newDate
        userStore.dashBoardFilters.customEndDate = newDate
        // Passer en mode custom si on modifie manuellement la date
        if (userStore.dashBoardFilters.period !== 'custom') {
            userStore.dashBoardFilters.period = 'custom'
        }
    },
})

const { filterLoading, load: onApplyFilters, loadDebounced: onApplyFiltersDebounced } = usePageDataManager({
    fetchFn: () => fetchData(
        userStore.dashBoardFilters.startDate,
        userStore.dashBoardFilters.endDate,
        true,
        userStore.dashBoardFilters.accountIds,
        displayModeNet.value,
        filters.value
    ),
    accounts,
    getAccountIds: () => userStore.dashBoardFilters.accountIds,
    setAccountIds: (ids) => { userStore.dashBoardFilters.accountIds = ids },
})

function resetFilters() {
    filters.value = []
    userStore.dashBoardFilters.showAdvancedFilters = false
    onApplyFiltersDebounced()
}

onMounted(async () => {
    // Clear data if autoDataSync is enabled
    if (settings?.autoDataSync) {
        clearLastTrades()
    }

    nextTick(async () => {
        if (settings?.autoDataSync)
            filterLoading.value = true

        await fetchAccounts()

        // Fetch les données seulement si le tableau est vide, ou si un refresh est requis (ex: changement de DB)
        if (dashBoardLastTrades.value.length === 0 || userStore.shouldRefreshData()) {
            await onApplyFilters()
            userStore.clearDataRefresh()
        }

        // Activer le rendu des graphiques après un court délai pour ne pas bloquer le rendu initial
        setTimeout(() => {
            chartsReady.value = true
        }, 50)

        filterLoading.value = false

    })
})

// Watcher sur la période
watch(
    () => userStore.dashBoardFilters.period,
    (period) => {
        if (period === 'custom') {
            // En mode custom, utiliser les dates sauvegardées (convertir en Date si nécessaire)
            userStore.dashBoardFilters.startDate = new Date(userStore.dashBoardFilters.customStartDate)
            userStore.dashBoardFilters.endDate = new Date(userStore.dashBoardFilters.customEndDate)
        } else {
            // Pour les autres modes, calculer les dates selon la période
            const { start, end } = getPeriodDates(period)
            userStore.dashBoardFilters.startDate = start ? start : new Date()
            userStore.dashBoardFilters.endDate = end ? end : new Date()
        }
    },
    { immediate: true }
)

// Appliquer les filtres quand les comptes changent
watch(
    () => [...(userStore.dashBoardFilters.accountIds || [])],
    () => {
        onApplyFiltersDebounced()
    },
    { deep: true }
)

// Relancer les filtres quand le mode d'affichage (Net/Brut) change
watch(
    () => displayModeNet.value,
    () => {
        onApplyFiltersDebounced()
    }
)

</script>
