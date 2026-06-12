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
                    :dirty="filterDirty"
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
                    @apply="onExplicitApply"
                    @reset="resetFilters"
                    @remove="(isLast) => { if (isLast) onExplicitApply() }"
                >
                    <template #after-accounts>
                        <div class="filter-actions-lg">
                            <USelect
                                v-model="userStore.dashBoardFilters.period"
                                class="w-auto select-none select-standard"
                                :ui="{ content: 'w-auto min-w-[var(--reka-select-trigger-width)]' }"
                                :items="periodOptions(locale)"
                                :placeholder="$t('components.dashboard.index.period')"
                            />
                            <UInput v-model="startDateStr" type="date" class="date-input" />
                            <UInput v-model="endDateStr" type="date" class="date-input" />
                            <UButton
                                icon="i-lucide-calendar-clock"
                                size="xs"
                                variant="ghost"
                                color="neutral"
                                :title="$t('components.dashboard.index.set_history_range')"
                                :loading="fetchingDateRange"
                                @click="setHistoryDateRange"
                            />
                        </div>
                        <!-- Ligne d'options avancées -->
                        <div class="">
                            <div class="form-row">
                                <label for="cumule-mode-select" class="font-medium">{{ $t('components.dashboard.index.aggregation') }}</label>
                                <USelect
                                    id="cumule-mode-select"
                                    v-model="localCumuleMode"
                                    :items="cumuleOptions"
                                    class="min-w-[120px] max-w-[200px] w-full"
                                    @update:model-value="onCumuleModeChange"
                                />
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
                    <UTooltip
                        :text="$t('components.dashboard.index.trades_count_tooltip')"
                        :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center"
                    >
                        <span class="dashboard-card-value">{{ dashBoardResult.tradesCount }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.cumulated_pnl') }}:</span>
                    <UTooltip
                        :text="$t('components.dashboard.index.cumulated_pnl_tooltip')"
                        :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center"
                    >
                        <span class="dashboard-card-value">{{ formatCurrency(dashBoardResult.pnl) }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.expectancy') }}:</span>
                    <UTooltip
                        :text="$t('components.dashboard.index.expectancy_tooltip')"
                        :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center"
                    >
                        <span class="dashboard-card-value">{{ formatCurrency(dashBoardResult.appt) }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.pl_ratio') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.pl_ratio_tooltip')" :ui="{ content: 'text-sm' }" class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ dashBoardResult.plRatio?.toFixed(2) }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.win_rate') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.win_rate_tooltip')" :ui="{ content: 'text-sm' }" class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ dashBoardResult.winrate?.toFixed(2) }}%</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.profit_factor') }}:</span>
                    <UTooltip
                        :text="$t('components.dashboard.index.profit_factor_tooltip')"
                        :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center"
                    >
                        <span class="dashboard-card-value">{{ formatValue(dashBoardResult.profitFactor) }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.recovery_factor') }}:</span>
                    <UTooltip
                        :text="$t('components.dashboard.index.recovery_factor_tooltip')"
                        :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center"
                    >
                        <span class="dashboard-card-value">{{ formatValue(dashBoardResult.recoveryFactor) }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.sharpe_ratio') }}:</span>
                    <UTooltip
                        :text="$t('components.dashboard.index.sharpe_ratio_tooltip')"
                        :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center"
                    >
                        <span class="dashboard-card-value">{{ dashBoardResult.sharpeRatio?.toFixed(2) }}</span>
                    </UTooltip>
                </div>
            </div>
        </div>

        <!-- Dashboard workspaces : onglets + contenu -->
        <div class="mb-8">
            <!-- Barre d'onglets -->
            <div class="flex items-center gap-1 mb-3 border-b border-default">
                <button
                    v-for="ws in workspaces"
                    :key="ws.id"
                    class="group relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-t-md"
                    :class="activeWorkspaceId === ws.id
                        ? 'text-primary border-b-2 border-primary -mb-px bg-default'
                        : 'text-muted hover:text-default hover:bg-elevated'"
                    @click="switchWorkspace(ws.id)"
                >
                    <UIcon
                        v-if="switchingToWorkspaceId === ws.id"
                        name="i-heroicons-arrow-path"
                        class="w-3.5 h-3.5 animate-spin"
                    />
                    <span>{{ ws.name }}</span>
                    <CommonModalDelete
                        v-if="workspaces.length > 1 && ws.id !== 'summary'"
                        @confirm="removeWorkspace(ws.id)"
                    >
                        <template #trigger>
                            <UButton
                                icon="i-lucide-x"
                                size="xs"
                                variant="ghost"
                                color="neutral"
                                class="opacity-0 group-hover:opacity-100 -mr-1 h-4 w-4 p-0"
                                @click.stop
                            />
                        </template>
                        <template #content>
                            {{ $t('components.dashboard.index.confirm_delete_workspace', { name: ws.name }) }}
                        </template>
                    </CommonModalDelete>
                </button>
                <UButton
                    icon="i-lucide-plus"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    class="ml-1 mb-px"
                    :title="$t('components.dashboard.index.add_workspace')"
                    :disabled="workspaces.length >= 3"
                    @click="addWorkspace"
                />
            </div>

            <!-- Barre de contrôle du workspace actif -->
            <div class="flex items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-1">
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
                    <!-- Renommer le workspace (sauf summary) -->
                    <div v-if="activeWorkspace?.id !== 'summary'" class="flex items-center gap-1 ml-4">
                        <UInput
                            v-model="workspaceRenameValue"
                            size="xs"
                            class="w-36"
                            maxlength="28"
                            @keydown.enter="renameActiveWorkspace"
                        />
                        <template v-if="workspaceRenameValue !== activeWorkspace?.name">
                            <UButton
                                icon="i-lucide-check"
                                size="xs"
                                color="success"
                                variant="ghost"
                                @click="renameActiveWorkspace"
                            />
                            <UButton
                                icon="i-lucide-x"
                                size="xs"
                                color="error"
                                variant="ghost"
                                @click="cancelRenameWorkspace"
                            />
                        </template>
                    </div>
                </div>
            </div>

            <!-- KeepAlive pour préserver l'état des workspaces -->
            <div class="relative">
                <KeepAlive>
                    <DashboardGridLayout
                        v-if="gridReady"
                        :key="activeWorkspaceId"
                        ref="gridLayoutRef"
                        :layout="gridLayout"
                        :components="gridComponents"
                        :shared-props="{ loading: filterLoading }"
                        :component-props="{ cumulatedPnl: { startingCapital: startingCapital } }"
                        :is-draggable="isGridDraggable"
                        :is-resizable="isGridDraggable"
                        :resizable-items="['tickerPnl', 'tickerTable']"
                        :col-num="gridColNum"
                    />
                </KeepAlive>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import DashboardChartsMainPnlBarChartEcharts from '~/components/dashboard/charts/main/PnlBarChartEcharts.vue'
import DashboardChartsMainCumulatedPnlChartEcharts from '~/components/dashboard/charts/main/CumulatedPnlChartEcharts.vue'
import DashboardChartsMainApptChartEcharts from '~/components/dashboard/charts/main/ApptChartEcharts.vue'
import DashboardChartsMainWinrateChartEcharts from '~/components/dashboard/charts/main/WinrateChartEcharts.vue'
import DashboardChartsTickerTickerPnlBarChart from '~/components/dashboard/charts/ticker/TickerPnlBarChart.vue'
import DashboardChartsTickerTickerWinrateScatterChart from '~/components/dashboard/charts/ticker/TickerWinrateScatterChart.vue'
import DashboardSectionsAllTradesSection from '~/components/dashboard/sections/AllTradesSection.vue'
import DashboardSectionsProfitTradesSection from '~/components/dashboard/sections/ProfitTradesSection.vue'
import DashboardSectionsLosingTradesSection from '~/components/dashboard/sections/LosingTradesSection.vue'
import DashboardSectionsWinLossComparisonSection from '~/components/dashboard/sections/WinLossComparisonSection.vue'
import DashboardSectionsTickerBreakdownTable from '~/components/dashboard/sections/TickerBreakdownTable.vue'
import DashboardChartsTickerHourlyPnlHeatmap from '~/components/dashboard/charts/ticker/HourlyPnlHeatmap.vue'
import DashboardChartsTickerHourlyWinrateBar from '~/components/dashboard/charts/ticker/HourlyWinrateBar.vue'

import {
    periodOptions,
    getPeriodDates,
    defaultDashboardGridLayout,
    defaultDashboardGridLayoutMd,
    defaultDashboardGridLayoutSm,
} from '~/utils/dashboard'
import type { SettingsContentType } from '~/schema/user'
import { formatDateToYYYYMMDD } from '~/utils/date-utils'
import { OPERATOR_EQUAL, metadataHelpers } from '~/utils'
import type { ChartKey, SectionKey, DashboardGridItem, WorkspaceConfig, WorkspaceId, TradeFilter } from '~/type'

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

const defaultChartVisibility: Record<ChartKey, boolean> = { pnlBar: true, cumulatedPnl: true, appt: true, winrate: true, tickerPnl: false, tickerWinrate: false, hourlyHeatmap: false, hourlyWinrate: false }
const defaultSectionVisibility: Record<SectionKey, boolean> = { allTrades: true, profitTrades: true, losingTrades: true, winLossComparison: true, tickerTable: false }

// --- Workspace helpers ---

const workspaces = computed(() => userStore.dashBoardFilters.workspaces || [])

const activeWorkspaceId = computed({
    get: () => userStore.dashBoardFilters.activeWorkspaceId || 'summary',
    set: (val: WorkspaceId) => {
        userStore.dashBoardFilters = { ...userStore.dashBoardFilters, activeWorkspaceId: val }
    },
})

const switchWorkspace = async (id: WorkspaceId) => {
    if (id === activeWorkspaceId.value) return
    switchingToWorkspaceId.value = id
    // Laisser le spinner s'afficher avant de switcher
    await nextTick()
    setTimeout(() => {
        activeWorkspaceId.value = id
        // Attendre le recalcul du grid
        setTimeout(() => {
            switchingToWorkspaceId.value = null
        }, 150)
    }, 0)
}

const activeWorkspace = computed(() =>
    workspaces.value.find(w => w.id === activeWorkspaceId.value) || workspaces.value[0]
)

const updateActiveWorkspace = (patch: Partial<WorkspaceConfig>) => {
    const updated = workspaces.value.map(w =>
        w.id === activeWorkspaceId.value ? { ...w, ...patch } : w
    )
    userStore.dashBoardFilters = { ...userStore.dashBoardFilters, workspaces: updated }
}

const chartVisibilityLg = computed({
    get: () => ({ ...defaultChartVisibility, ...(activeWorkspace.value?.dashboardChartVisibilityLg || {}) }),
    set: (val) => updateActiveWorkspace({ dashboardChartVisibilityLg: val }),
})
const chartVisibilityMd = computed({
    get: () => ({ ...defaultChartVisibility, ...(activeWorkspace.value?.dashboardChartVisibilityMd || {}) }),
    set: (val) => updateActiveWorkspace({ dashboardChartVisibilityMd: val }),
})
const chartVisibilitySm = computed({
    get: () => ({ ...defaultChartVisibility, ...(activeWorkspace.value?.dashboardChartVisibilitySm || {}) }),
    set: (val) => updateActiveWorkspace({ dashboardChartVisibilitySm: val }),
})

const sectionVisibilityLg = computed({
    get: () => ({ ...defaultSectionVisibility, ...(activeWorkspace.value?.dashboardSectionVisibilityLg || {}) }),
    set: (val) => updateActiveWorkspace({ dashboardSectionVisibilityLg: val }),
})
const sectionVisibilityMd = computed({
    get: () => ({ ...defaultSectionVisibility, ...(activeWorkspace.value?.dashboardSectionVisibilityMd || {}) }),
    set: (val) => updateActiveWorkspace({ dashboardSectionVisibilityMd: val }),
})
const sectionVisibilitySm = computed({
    get: () => ({ ...defaultSectionVisibility, ...(activeWorkspace.value?.dashboardSectionVisibilitySm || {}) }),
    set: (val) => updateActiveWorkspace({ dashboardSectionVisibilitySm: val }),
})

const activeChartVisibility = computed(() => {
    switch (currentBreakpoint.value) {
        case 'md':
            return chartVisibilityMd.value
        case 'sm':
            return chartVisibilitySm.value
        default:
            return chartVisibilityLg.value
    }
})

const activeSectionVisibility = computed(() => {
    switch (currentBreakpoint.value) {
        case 'md':
            return sectionVisibilityMd.value
        case 'sm':
            return sectionVisibilitySm.value
        default:
            return sectionVisibilityLg.value
    }
})

const appConfig = useAppConfig()
const useChartjs = computed(() => appConfig.charts.chartjs === true)

const gridComponents = computed(() => {
    const chartComponentMap: Record<ChartKey, Component | string> = {
        pnlBar: DashboardChartsMainPnlBarChartEcharts,
        cumulatedPnl: DashboardChartsMainCumulatedPnlChartEcharts,
        appt: DashboardChartsMainApptChartEcharts,
        winrate: DashboardChartsMainWinrateChartEcharts,
        tickerPnl: DashboardChartsTickerTickerPnlBarChart,
        tickerWinrate: DashboardChartsTickerTickerWinrateScatterChart,
        hourlyHeatmap: DashboardChartsTickerHourlyPnlHeatmap,
        hourlyWinrate: DashboardChartsTickerHourlyWinrateBar,
    }
    const sectionComponentMap: Record<SectionKey, Component | string> = {
        allTrades: DashboardSectionsAllTradesSection,
        profitTrades: DashboardSectionsProfitTradesSection,
        losingTrades: DashboardSectionsLosingTradesSection,
        winLossComparison: DashboardSectionsWinLossComparisonSection,
        tickerTable: DashboardSectionsTickerBreakdownTable,
    }
    return { ...chartComponentMap, ...sectionComponentMap }
})

const gridLayoutRef = ref<{ getLayout: () => DashboardGridItem[] } | null>(null)

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
    const ws = activeWorkspace.value
    switch (currentBreakpoint.value) {
        case 'md':
            return ws?.dashboardGridLayoutMd?.length ? ws.dashboardGridLayoutMd : defaultDashboardGridLayoutMd
        case 'sm':
            return ws?.dashboardGridLayoutSm?.length ? ws.dashboardGridLayoutSm : defaultDashboardGridLayoutSm
        default:
            return ws?.dashboardGridLayout?.length ? ws.dashboardGridLayout : defaultDashboardGridLayout
    }
})

const gridColNum = computed(() => {
    switch (currentBreakpoint.value) {
        case 'md':
            return 6
        case 'sm':
            return 3
        default:
            return 12
    }
})

const gridLayout = computed(() => {
    const baseLayout = defaultLayoutForBreakpoint.value
    const visible = baseLayout.filter((item) => {
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
    const hiddenItems = currentLayout.filter((item) => {
        if (item.i in activeChartVisibility.value) return !activeChartVisibility.value[item.i as ChartKey]
        if (item.i in activeSectionVisibility.value) return !activeSectionVisibility.value[item.i as SectionKey]
        return false
    })
    const saved = [...newLayout, ...hiddenItems]
    switch (currentBreakpoint.value) {
        case 'md':
            updateActiveWorkspace({ dashboardGridLayoutMd: saved })
            break
        case 'sm':
            updateActiveWorkspace({ dashboardGridLayoutSm: saved })
            break
        default:
            updateActiveWorkspace({ dashboardGridLayout: saved })
    }
}

const onResetLayout = () => {
    // Sur un workspace personnalisé, on vide la grille plutôt que de remettre le layout par défaut
    if (activeWorkspaceId.value !== 'summary') {
        updateActiveWorkspace({
            dashboardChartVisibilityLg: { ...emptyChartVisibility },
            dashboardChartVisibilityMd: { ...emptyChartVisibility },
            dashboardChartVisibilitySm: { ...emptyChartVisibility },
            dashboardSectionVisibilityLg: { ...emptySectionVisibility },
            dashboardSectionVisibilityMd: { ...emptySectionVisibility },
            dashboardSectionVisibilitySm: { ...emptySectionVisibility },
            dashboardGridLayout: [],
            dashboardGridLayoutMd: [],
            dashboardGridLayoutSm: [],
        })
        return
    }

    // Sur summary, reset classique avec le layout par défaut
    updateActiveWorkspace({
        dashboardChartVisibilityLg: { ...defaultChartVisibility },
        dashboardChartVisibilityMd: { ...defaultChartVisibility },
        dashboardChartVisibilitySm: { ...defaultChartVisibility },
        dashboardSectionVisibilityLg: { ...defaultSectionVisibility },
        dashboardSectionVisibilityMd: { ...defaultSectionVisibility },
        dashboardSectionVisibilitySm: { ...defaultSectionVisibility },
        dashboardGridLayout: defaultDashboardGridLayout.map(item => ({ ...item })),
        dashboardGridLayoutMd: defaultDashboardGridLayoutMd.map(item => ({ ...item })),
        dashboardGridLayoutSm: defaultDashboardGridLayoutSm.map(item => ({ ...item })),
    })
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
    set: (val) => (userStore.dashBoardFilters.filters = val),
})

// Calculer le capital de départ en additionnant les capitaux des comptes sélectionnés
const startingCapital = computed(() => {
    const selectedAccountIds = userStore.dashBoardFilters.accountIds

    // Filtrer les comptes sélectionnés qui existent réellement
    let availableAccounts = accounts.value
    if (selectedAccountIds && selectedAccountIds.length > 0) {
        availableAccounts = accounts.value.filter((acc) => selectedAccountIds.includes(acc.id))
    }

    // Additionner les capitaux de départ de tous les comptes disponibles
    let totalCapital = 0

    for (const account of availableAccounts) {
        const capital = metadataHelpers.get<number>(account.metadata, 'startingCapital')
        if (capital !== null && capital !== undefined) {
            totalCapital += capital
        } else {
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
                accountIds: JSON.stringify(userStore.dashBoardFilters.accountIds),
            },
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
const switchingToWorkspaceId = ref<WorkspaceId | null>(null)

// --- Workspace management ---

const workspaceRenameValue = ref(activeWorkspace.value?.name || '')

watch(activeWorkspace, (ws) => {
    workspaceRenameValue.value = ws?.name || ''
})

const emptyChartVisibility: Record<ChartKey, boolean> = { pnlBar: false, cumulatedPnl: false, appt: false, winrate: false, tickerPnl: false, tickerWinrate: false }
const emptySectionVisibility: Record<SectionKey, boolean> = { allTrades: false, profitTrades: false, losingTrades: false, winLossComparison: false, tickerTable: false }

// Default config for new workspaces - shows ticker charts
const newWorkspaceChartVisibility: Record<ChartKey, boolean> = { pnlBar: false, cumulatedPnl: false, appt: false, winrate: false, tickerPnl: true, tickerWinrate: true }
const newWorkspaceSectionVisibility: Record<SectionKey, boolean> = { allTrades: false, profitTrades: false, losingTrades: false, winLossComparison: false, tickerTable: true }

const newWorkspaceGridLayout = [
    { x: 0, y: 0, w: 6, h: 8, i: 'tickerPnl' },
    { x: 6, y: 0, w: 6, h: 6, i: 'tickerWinrate' },
    { x: 0, y: 8, w: 12, h: 12, i: 'tickerTable' },
]

const addWorkspace = () => {
    if (workspaces.value.length >= 3) return
    const id = `workspace-${Date.now()}`
    const name = `Workspace ${workspaces.value.length + 1}`
    const newWorkspace: WorkspaceConfig = {
        id,
        name,
        dashboardChartVisibilityLg: { ...newWorkspaceChartVisibility },
        dashboardChartVisibilityMd: { ...newWorkspaceChartVisibility },
        dashboardChartVisibilitySm: { ...newWorkspaceChartVisibility },
        dashboardSectionVisibilityLg: { ...newWorkspaceSectionVisibility },
        dashboardSectionVisibilityMd: { ...newWorkspaceSectionVisibility },
        dashboardSectionVisibilitySm: { ...newWorkspaceSectionVisibility },
        dashboardGridLayout: [...newWorkspaceGridLayout],
        dashboardGridLayoutMd: [...newWorkspaceGridLayout],
        dashboardGridLayoutSm: [...newWorkspaceGridLayout],
    }
    const updated = [...workspaces.value, newWorkspace]
    userStore.dashBoardFilters = { ...userStore.dashBoardFilters, workspaces: updated, activeWorkspaceId: id }
}

const removeWorkspace = (id: WorkspaceId) => {
    if (id === 'summary') return
    const updated = workspaces.value.filter(w => w.id !== id)
    const newActiveId = activeWorkspaceId.value === id ? 'summary' : activeWorkspaceId.value
    userStore.dashBoardFilters = { ...userStore.dashBoardFilters, workspaces: updated, activeWorkspaceId: newActiveId }
}

const renameActiveWorkspace = () => {
    const name = workspaceRenameValue.value.trim()
    if (!name || name === activeWorkspace.value?.name) return
    updateActiveWorkspace({ name })
}

const cancelRenameWorkspace = () => {
    workspaceRenameValue.value = activeWorkspace.value?.name || ''
}

// Variable locale pour le mode cumulé (buffer en mode manuel)
const localCumuleMode = ref(userStore.dashBoardFilters.cumuleMode)

// Fonction pour construire les filtres du dashboard
const buildDashboardFilters = (): TradeFilter[] => {
    return buildFiltersForApi(
        userStore.dashBoardFilters.startDate,
        userStore.dashBoardFilters.endDate,
        true,
        userStore.dashBoardFilters.accountIds,
        filters.value
    )
}

// Utiliser le pattern générique pour la gestion des filtres
const {
    filterDirty,
    isAutoApplyMode,
    updateTradeCount,
    handleFilterChange,
    debouncedHandleFilterChange,
    onExplicitApply,
} = useFilteredPage({
    pageType: 'dashboard',
    onFetch: async () => {
        await onApplyFilters()
        userStore.dashBoardFilters.cumuleMode = localCumuleMode.value
    },
    buildFiltersFn: buildDashboardFilters,
    debounceMs: 300,
})

const onCumuleModeChange = () => {
    // Laisser l'UI mettre à jour le sélecteur avant de lancer les calculs lourds
    nextTick(() => {
        setTimeout(() => {
            if (isAutoApplyMode.value) {
                userStore.dashBoardFilters.cumuleMode = localCumuleMode.value
            }
            // Recalculer le count et mettre à jour dirty
            handleFilterChange(false) // false = pas de fetch auto, juste count + dirty
        }, 20)
    })
}

const {
    filterLoading,
    load: onApplyFilters,
    loadDebounced: onApplyFiltersDebounced,
} = usePageDataManager({
    fetchFn: async () => {
        filterDirty.value = false
        const trades = await fetchData(
            userStore.dashBoardFilters.startDate,
            userStore.dashBoardFilters.endDate,
            true,
            userStore.dashBoardFilters.accountIds,
            displayModeNet.value,
            filters.value
        )
        // Copier le cumulé APRES le fetch pour éviter le double rendu
        userStore.dashBoardFilters.cumuleMode = localCumuleMode.value
        return trades
    },
    accounts,
    getAccountIds: () => userStore.dashBoardFilters.accountIds,
    setAccountIds: (ids) => {
        userStore.dashBoardFilters.accountIds = ids
    },
})

function resetFilters() {
    filters.value = []
    userStore.dashBoardFilters.showAdvancedFilters = false
    onApplyFiltersDebounced()
}

// _onResetFilters est exposé par useFilteredPage si besoin

onMounted(() => {
    // Clear data if autoDataSync is enabled
    if (settings?.autoDataSync) {
        clearLastTrades()
    }

    filterLoading.value = true

    // Lancer les requêtes en background sans await — le skeleton s'affiche immédiatement
    Promise.all([fetchAccounts(), fetchGroups(), updateTradeCount()]).then(() => {
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

// DEBUG: Test watchers un par un

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

// Watcher unique pour les comptes (debounced) - sans deep pour éviter re-fetch KeepAlive
let lastAccountIds: number[] = []
watch(
    () => userStore.dashBoardFilters.accountIds,
    (newIds) => {
        const currentIds = newIds || []
        const changed = currentIds.length !== lastAccountIds.length ||
            currentIds.some((id, i) => id !== lastAccountIds[i])
        if (changed) {
            lastAccountIds = [...currentIds]
            debouncedHandleFilterChange()
        }
    }
)

// Watcher unique pour les dates (debounced)
watch([startDateStr, endDateStr], () => debouncedHandleFilterChange())

// Watcher pour les filtres avancés (debounced, mais pas si loading)
watch(
    () => filters.value,
    (newFilters, oldFilters) => {
        if (filterLoading.value) return

        // Si c'est juste un ajout de filtre vide, ne pas déclencher
        if (newFilters && oldFilters && newFilters.length > oldFilters.length) {
            const addedFilter = newFilters[newFilters.length - 1]
            if (!addedFilter.value || addedFilter.value === '') {
                return
            }
        }

        debouncedHandleFilterChange()
    },
    { deep: true }
)

// Net/Gross change (pas de recalc de count, juste re-render)
watch(
    () => displayModeNet.value,
    () => {
        if (isAutoApplyMode.value) onApplyFiltersDebounced()
    }
)
</script>
