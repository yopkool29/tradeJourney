<template>
    <div>
        <UCard class="card-container-xl">
            <template #default>
                <CommonTradeFilters
                    v-model:account-ids="userStore.dashBoardFilters.accountIds"
                    v-model:show-inactive="userStore.dashBoardFilters.showInactive"
                    v-model:filters="filters"
                    v-model:show-advanced-filters="userStore.dashBoardFilters.showAdvancedFilters"
                    v-model:last-filter-column="userStore.dashBoardFilters.lastFilterColumn"
                    :title="$t('components.dashboard.index.accounts')"
                    slot-id="page-dashboard"
                    :show-plugin-slot="true"
                    :filter-loading="filterLoading"
                    :account-options="accountOptions"
                    :placeholder="$t('components.dashboard.index.select_accounts')"
                    :all-label="$t('components.dashboard.index.all_accounts')"
                    :selected-label="$t('components.dashboard.index.selected_accounts', { count: userStore.dashBoardFilters.accountIds?.length })"
                    :show-inactive-checkbox="false"
                    :tag-groups="tagGroups"
                    @apply="onApplyFiltersDebounced"
                    @reset="resetFilters"
                >
                    <template #after-accounts>
                        <div class="filter-actions-lg">
                            <USelect 
                            v-model="userStore.dashBoardFilters.period"
                            class="w-auto select-none select-standard" 
                            :ui="{ content: 'w-auto min-w-[var(--reka-select-trigger-width)]' }" :items="periodOptions(locale)"
                                :placeholder="$t('components.dashboard.index.period')"/>
                            <UInput v-model="startDateStr" type="date" class="date-input" />
                            <UInput v-model="endDateStr" type="date" class="date-input" />
                            <UButton icon="i-lucide-calendar-clock" size="xs" variant="ghost" color="neutral"
                                :title="$t('components.dashboard.index.set_history_range')"
                                :loading="fetchingDateRange"
                                @click="setHistoryDateRange" />
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
        
        <!-- Dashboard items : graphiques + sections -->
        <div class="mb-8">
            <div class="flex justify-start gap-2 mb-2">
                <DashboardVisibilityMenu
                    v-if="currentBreakpoint === 'lg'"
                    v-model:chart-visibility="chartVisibilityLg"
                    v-model:section-visibility="sectionVisibilityLg"
                />
                <DashboardVisibilityMenu
                    v-if="currentBreakpoint === 'md'"
                    v-model:chart-visibility="chartVisibilityMd"
                    v-model:section-visibility="sectionVisibilityMd"
                />
                <DashboardVisibilityMenu
                    v-if="currentBreakpoint === 'sm'"
                    v-model:chart-visibility="chartVisibilitySm"
                    v-model:section-visibility="sectionVisibilitySm"
                />
                <UButton
                    icon="i-lucide-list-restart"
                    size="sm"
                    variant="ghost"
                    color="neutral"
                    :title="$t('components.dashboard.index.reset_layout')"
                    @click="onResetLayout"
                />
                <UButton
                    :icon="isGridDraggable ? 'i-lucide-lock' : 'i-lucide-move'"
                    size="sm"
                    variant="ghost"
                    :color="isGridDraggable ? 'warning' : 'neutral'"
                    :title="isGridDraggable ? $t('components.dashboard.index.lock_layout') : $t('components.dashboard.index.unlock_layout')"
                    @click="() => { if (isGridDraggable) saveGridLayout(); isGridDraggable = !isGridDraggable }"
                />
            </div>
            <DashboardGridLayout
                v-if="gridReady"
                :key="gridResetKey"
                ref="gridLayoutRef"
                :layout="gridLayout"
                :components="gridComponents"
                :shared-props="{ loading: filterLoading }"
                :component-props="{ cumulatedPnl: { startingCapital: startingCapital } }"
                :is-draggable="isGridDraggable"
                :col-num="gridColNum"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { periodOptions, getPeriodDates, defaultDashboardGridLayout, defaultDashboardGridLayoutMd, defaultDashboardGridLayoutSm } from '~/utils/dashboard'
import type { SettingsContentType } from '~/schema/user'
import { formatDateToYYYYMMDD } from '~/utils/date-utils'
import { OPERATOR_EQUAL, metadataHelpers } from '~/utils'
import type { ChartKey, SectionKey, DashboardGridItem } from '~/type'

const { formatCurrency } = useUtils()

const userStore = useUserStore()
const settings = userStore.user?.settings_object as SettingsContentType
const { fetchAccounts, fetchData, accounts, dashBoardLastTrades, dashBoardResult, clearLastTrades } = useDashboard()
const { displayModeNet } = useNetGrossDisplay()
const { tagGroups, fetchGroups } = useTags()
const chartsReady = ref(false)
const chartsCanRender = ref(false)
const gridReady = ref(false)
const { t, locale } = useI18n()

const defaultChartVisibility: Record<ChartKey, boolean> = { pnlBar: true, cumulatedPnl: true, appt: true, winrate: true }
const defaultSectionVisibility: Record<SectionKey, boolean> = { allTrades: true, profitTrades: true, losingTrades: true, winLossComparison: true }

const chartVisibilityLg = computed({
    get: () => ({ ...defaultChartVisibility, ...(userStore.dashBoardFilters.dashboardChartVisibilityLg || {}) }),
    set: (val) => { userStore.dashBoardFilters = { ...userStore.dashBoardFilters, dashboardChartVisibilityLg: val } }
})
const chartVisibilityMd = computed({
    get: () => ({ ...defaultChartVisibility, ...(userStore.dashBoardFilters.dashboardChartVisibilityMd || {}) }),
    set: (val) => { userStore.dashBoardFilters = { ...userStore.dashBoardFilters, dashboardChartVisibilityMd: val } }
})
const chartVisibilitySm = computed({
    get: () => ({ ...defaultChartVisibility, ...(userStore.dashBoardFilters.dashboardChartVisibilitySm || {}) }),
    set: (val) => { userStore.dashBoardFilters = { ...userStore.dashBoardFilters, dashboardChartVisibilitySm: val } }
})

const sectionVisibilityLg = computed({
    get: () => ({ ...defaultSectionVisibility, ...(userStore.dashBoardFilters.dashboardSectionVisibilityLg || {}) }),
    set: (val) => { userStore.dashBoardFilters = { ...userStore.dashBoardFilters, dashboardSectionVisibilityLg: val } }
})
const sectionVisibilityMd = computed({
    get: () => ({ ...defaultSectionVisibility, ...(userStore.dashBoardFilters.dashboardSectionVisibilityMd || {}) }),
    set: (val) => { userStore.dashBoardFilters = { ...userStore.dashBoardFilters, dashboardSectionVisibilityMd: val } }
})
const sectionVisibilitySm = computed({
    get: () => ({ ...defaultSectionVisibility, ...(userStore.dashBoardFilters.dashboardSectionVisibilitySm || {}) }),
    set: (val) => { userStore.dashBoardFilters = { ...userStore.dashBoardFilters, dashboardSectionVisibilitySm: val } }
})

const activeChartVisibility = computed(() => {
    switch (currentBreakpoint.value) {
        case 'md': return chartVisibilityMd.value
        case 'sm': return chartVisibilitySm.value
        default: return chartVisibilityLg.value
    }
})

const activeSectionVisibility = computed(() => {
    switch (currentBreakpoint.value) {
        case 'md': return sectionVisibilityMd.value
        case 'sm': return sectionVisibilitySm.value
        default: return sectionVisibilityLg.value
    }
})

const appConfig = useAppConfig()
const useChartjs = computed(() => appConfig.charts.chartjs === true)

const gridComponents = computed(() => {
    const chartComponentMap: Record<ChartKey, Component | string> = useChartjs.value ? {
        pnlBar: resolveComponent('DashboardChartsPnlBarChart'),
        cumulatedPnl: resolveComponent('DashboardChartsCumulatedPnlChart2'),
        appt: resolveComponent('DashboardChartsApptChart'),
        winrate: resolveComponent('DashboardChartsWinrateChart'),
    } : {
        pnlBar: resolveComponent('DashboardChartsPnlBarChartEcharts'),
        cumulatedPnl: resolveComponent('DashboardChartsCumulatedPnlChartEcharts'),
        appt: resolveComponent('DashboardChartsApptChartEcharts'),
        winrate: resolveComponent('DashboardChartsWinrateChartEcharts'),
    }
    const sectionComponentMap: Record<SectionKey, Component | string> = {
        allTrades: resolveComponent('DashboardAllTradesSection'),
        profitTrades: resolveComponent('DashboardProfitTradesSection'),
        losingTrades: resolveComponent('DashboardLosingTradesSection'),
        winLossComparison: resolveComponent('DashboardWinLossComparisonSection'),
    }
    return { ...chartComponentMap, ...sectionComponentMap }
})

const gridLayoutRef = ref<{ getLayout: () => DashboardGridItem[] } | null>(null)
const gridResetKey = ref(0)

// Breakpoint detection: lg >= 768, md >= 530, sm < 530
const currentBreakpoint = ref<'lg' | 'md' | 'sm'>('lg')

const updateBreakpoint = () => {
    const w = window.innerWidth
    if (w >= 768) currentBreakpoint.value = 'lg'
    else if (w >= 530) currentBreakpoint.value = 'md'
    else currentBreakpoint.value = 'sm'
}

onMounted(() => {
    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateBreakpoint)
})

const defaultLayoutForBreakpoint = computed(() => {
    const filters = userStore.dashBoardFilters
    switch (currentBreakpoint.value) {
        case 'md': {
            const saved = filters.dashboardGridLayoutMd
            return saved?.length ? saved : defaultDashboardGridLayoutMd
        }
        case 'sm': {
            const saved = filters.dashboardGridLayoutSm
            return saved?.length ? saved : defaultDashboardGridLayoutSm
        }
        default: {
            const saved = filters.dashboardGridLayout
            return saved?.length ? saved : defaultDashboardGridLayout
        }
    }
})

const gridColNum = computed(() => {
    switch (currentBreakpoint.value) {
        case 'md': return 6
        case 'sm': return 3
        default: return 12
    }
})

const gridLayout = computed(() => {
    const baseLayout = defaultLayoutForBreakpoint.value
    const visible = baseLayout.filter(item => {
        if (item.i in activeChartVisibility.value) return activeChartVisibility.value[item.i as ChartKey]
        if (item.i in activeSectionVisibility.value) return activeSectionVisibility.value[item.i as SectionKey]
        return false
    })
    return visible
})

const saveGridLayout = () => {
    const newLayout = gridLayoutRef.value?.getLayout()
    if (!newLayout) return
    const currentLayout = defaultLayoutForBreakpoint.value
    const hiddenItems = currentLayout.filter(item => {
        if (item.i in activeChartVisibility.value) return !activeChartVisibility.value[item.i as ChartKey]
        if (item.i in activeSectionVisibility.value) return !activeSectionVisibility.value[item.i as SectionKey]
        return false
    })
    const saved = [...newLayout, ...hiddenItems]
    const filters = userStore.dashBoardFilters
    switch (currentBreakpoint.value) {
        case 'md':
            userStore.dashBoardFilters = { ...filters, dashboardGridLayoutMd: saved }
            break
        case 'sm':
            userStore.dashBoardFilters = { ...filters, dashboardGridLayoutSm: saved }
            break
        default:
            userStore.dashBoardFilters = { ...filters, dashboardGridLayout: saved }
    }
}

const onResetLayout = () => {
    const updated = {
        ...userStore.dashBoardFilters,
        dashboardChartVisibilityLg: defaultChartVisibility,
        dashboardSectionVisibilityLg: defaultSectionVisibility,
        dashboardChartVisibilityMd: defaultChartVisibility,
        dashboardSectionVisibilityMd: defaultSectionVisibility,
        dashboardChartVisibilitySm: defaultChartVisibility,
        dashboardSectionVisibilitySm: defaultSectionVisibility,
        dashboardGridLayout: defaultDashboardGridLayout.map(item => ({ ...item })),
        dashboardGridLayoutMd: defaultDashboardGridLayoutMd.map(item => ({ ...item })),
        dashboardGridLayoutSm: defaultDashboardGridLayoutSm.map(item => ({ ...item })),
    }
    userStore.dashBoardFilters = updated
    gridResetKey.value++
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

const fetchingDateRange = ref(false)

const setHistoryDateRange = async () => {
    fetchingDateRange.value = true
    try {
        const result = await $fetch<{ minDate: string | null; maxDate: string | null }>('/api/trades/date-range', {
            query: {
                accountIds: JSON.stringify(userStore.dashBoardFilters.accountIds)
            }
        })

        if (result.minDate && result.maxDate) {
            userStore.dashBoardFilters.startDate = new Date(result.minDate)
            userStore.dashBoardFilters.endDate = new Date(result.maxDate)
            userStore.dashBoardFilters.customStartDate = new Date(result.minDate)
            userStore.dashBoardFilters.customEndDate = new Date(result.maxDate)
            userStore.dashBoardFilters.period = 'custom'
            await onApplyFiltersDebounced()
        }
    } catch (error) {
        console.error('Error fetching date range:', error)
    } finally {
        fetchingDateRange.value = false
    }
}

const isGridDraggable = ref(false)

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

onMounted(() => {
    // Clear data if autoDataSync is enabled
    if (settings?.autoDataSync) {
        clearLastTrades()
    }

    filterLoading.value = true

    // Lancer les requêtes en background sans await — le skeleton s'affiche immédiatement
    Promise.all([
        fetchAccounts(),
        fetchGroups()
    ]).then(() => {
        if (dashBoardLastTrades.value.length === 0 || userStore.shouldRefreshData()) {
            onApplyFilters()
            userStore.clearDataRefresh()
        } else {
            filterLoading.value = false
        }
    })

    // Afficher les charts après le premier paint pour éviter le blocage initial
    requestAnimationFrame(() => {
        setTimeout(() => {
            gridReady.value = true
            chartsCanRender.value = true
            chartsReady.value = true
        }, 0)
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
