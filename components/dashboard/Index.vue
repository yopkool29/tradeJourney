<template>
    <div>
        <!-- Bouton fixe pour reverrouiller le layout (visible seulement en mode déverrouillé) -->
        <UButton
            v-if="isGridDraggable"
            icon="i-lucide-lock"
            size="lg"
            color="primary"
            variant="solid"
            class="fixed left-4 top-1/2 -translate-y-1/2 z-50 shadow-lg"
            :title="$t('components.dashboard.index.lock_layout')"
            @click="() => { saveGridLayout(); isGridDraggable = false }"
        />
        <UCard class="card-container-xl">
            <template #default>
                <CommonTradeFilters
                    v-model:account-ids="dbStateStore.dashBoardFilters.accountIds"
                    v-model:show-inactive="dbStateStore.dashBoardFilters.showInactive"
                    v-model:filters="filters"
                    v-model:show-advanced-filters="dbStateStore.dashBoardFilters.showAdvancedFilters"
                    v-model:last-filter-column="dbStateStore.dashBoardFilters.lastFilterColumn"
                    :dirty="filterDirty"
                    :title="$t('components.dashboard.index.accounts')"
                    slot-id="page-dashboard"
                    :show-plugin-slot="true"
                    :filter-loading="filterLoading"
                    :account-options="accountOptions"
                    :placeholder="$t('components.dashboard.index.select_accounts')"
                    :all-label="$t('components.dashboard.index.all_accounts')"
                    :selected-label="$t('components.dashboard.index.selected_accounts', { count: dbStateStore.dashBoardFilters.accountIds?.length })"
                    :show-inactive-checkbox="false"
                    :tag-groups="tagGroups"
                    @apply="onExplicitApply"
                    @reset="resetFilters"
                    @remove="(isLast) => { if (isLast) onExplicitApply() }"
                >
                    <template #after-accounts>
                        <div class="filter-actions-lg">
                            <USelect
                                v-model="dbStateStore.dashBoardFilters.period"
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
                    </template>
                </CommonTradeFilters>
            </template>
        </UCard>

        <div class="flex flex-col gap-4 max-w-5xl mb-8">
            <!-- Overview : Cards (Nuxt UI) -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.trades_count') }}:</span>
                    <span class="dashboard-card-value" :title="$t('components.dashboard.index.trades_count_tooltip')">{{ dashBoardResult.tradesCount }}</span>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.cumulated_pnl') }}:</span>
                    <span class="dashboard-card-value" :title="$t('components.dashboard.index.cumulated_pnl_tooltip')">{{ formatCurrency(dashBoardResult.pnl) }}</span>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.expectancy') }}:</span>
                    <span class="dashboard-card-value" :title="$t('components.dashboard.index.expectancy_tooltip')">{{ formatCurrency(dashBoardResult.appt) }}</span>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.pl_ratio') }}:</span>
                    <span class="dashboard-card-value" :title="$t('components.dashboard.index.pl_ratio_tooltip')">{{ dashBoardResult.plRatio?.toFixed(2) }}</span>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.win_rate') }}:</span>
                    <span class="dashboard-card-value" :title="$t('components.dashboard.index.win_rate_tooltip')">{{ dashBoardResult.winrate?.toFixed(2) }}%</span>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.profit_factor') }}:</span>
                    <span class="dashboard-card-value" :title="$t('components.dashboard.index.profit_factor_tooltip')">{{ formatValue(dashBoardResult.profitFactor) }}</span>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.recovery_factor') }}:</span>
                    <span class="dashboard-card-value" :title="$t('components.dashboard.index.recovery_factor_tooltip')">{{ formatValue(dashBoardResult.recoveryFactor) }}</span>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.sharpe_ratio') }}:</span>
                    <span class="dashboard-card-value" :title="$t('components.dashboard.index.sharpe_ratio_tooltip')">{{ dashBoardResult.sharpeRatio?.toFixed(2) }}</span>
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
                    class="group relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-t-md cursor-pointer"
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
                    :disabled="workspaces.length >= 5"
                    @click="addWorkspace"
                />
                <div class="flex-1" />
                <UButton
                    icon="i-lucide-copy"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    class="ml-1 mb-px"
                    :title="$t('components.dashboard.index.sync_workspace')"
                    @click="syncActiveWorkspaceToOtherDatabases"
                />
                <UButton
                    icon="i-lucide-monitor"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    class="ml-1 mb-px"
                    :title="$t('components.dashboard.index.sync_dashboard')"
                    @click="syncDashboardToOtherDatabases"
                />
            </div>

            <!-- Barre de contrôle du workspace actif -->
            <div class="flex items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-1 pl-3">
                    <DashboardVisibilityMenu
                        v-if="currentBreakpoint === 'lg'"
                        v-model:chart-visibility="chartVisibilityLg"
                        v-model:section-visibility="sectionVisibilityLg"
                        @sync-to-all-breakpoints="onSyncVisibilityToAllBreakpoints"
                    />
                    <DashboardVisibilityMenu
                        v-if="currentBreakpoint === 'md'"
                        v-model:chart-visibility="chartVisibilityMd"
                        v-model:section-visibility="sectionVisibilityMd"
                        @sync-to-all-breakpoints="onSyncVisibilityToAllBreakpoints"
                    />
                    <DashboardVisibilityMenu
                        v-if="currentBreakpoint === 'sm'"
                        v-model:chart-visibility="chartVisibilitySm"
                        v-model:section-visibility="sectionVisibilitySm"
                        @sync-to-all-breakpoints="onSyncVisibilityToAllBreakpoints"
                    />
                    <UButton
                        :icon="isGridDraggable ? 'i-lucide-lock' : 'i-lucide-move'"
                        size="sm"
                        variant="ghost"
                        :color="isGridDraggable ? 'primary' : 'neutral'"
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
                    <div class="w-4" />
                    <UButton
                        icon="i-lucide-list-restart"
                        size="sm"
                        variant="ghost"
                        color="neutral"
                        :title="$t('components.dashboard.index.reset_layout')"
                        @click="onResetLayout"
                    >
                        {{ $t('components.dashboard.index.reset_layout') }}
                    </UButton>
                </div>
            </div>

            <!-- Workspaces with KeepAlive -->
            <div class="relative" :class="{ 'min-h-[400px]': !gridReady || switchingToWorkspaceId !== null }">
                <!-- <KeepAlive :max="1"> -->
                    <DashboardGridLayout
                        v-if="gridReady"
                        :key="activeWorkspaceId"
                        ref="gridLayoutRef"
                        :layout="gridLayout"
                        :components="gridComponents"
                        :shared-props="{ loading: filterLoading || switchingToWorkspaceId !== null }"
                        :component-props="breakdownComponentProps"
                        :is-draggable="isGridDraggable"
                        :is-resizable="isGridDraggable"
                        :resizable-items="allResizableItems"
                        :removable-items="allRemovableItems"
                        :col-num="gridColNum"
                        @remove-item="onRemoveItem"
                    />
                <!-- </KeepAlive> -->
            </div>
        </div>
    </div>

    <CommonModalDefault
        v-model:open="showUnsavedChangesModal"
        :title="t('components.dashboard.index.unsaved_changes_title')"
    >
        <template #content>
            <p>{{ t('components.dashboard.index.unsaved_changes_message') }}</p>
        </template>
        <template #footer>
            <UButton size="sm" color="primary" @click="onSaveAndSwitch">
                {{ t('common.actions.save') }}
            </UButton>
            <UButton size="sm" color="neutral" variant="ghost" @click="onDiscardAndSwitch">
                {{ t('common.no') }}
            </UButton>
            <UButton size="sm" color="neutral" variant="ghost" @click="onCancelSwitch">
                {{ t('common.cancel') }}
            </UButton>
        </template>
    </CommonModalDefault>
</template>

<script setup lang="ts">
import DashboardChartsBreakdownBreakdownWidget from '~/components/dashboard/charts/breakdown/BreakdownWidget.vue'
import DashboardChartsTimeseriesTimeSeriesWidget from '~/components/dashboard/charts/timeseries/TimeSeriesWidget.vue'
import DashboardChartsCalendarCalendarWidget from '~/components/dashboard/charts/calendar/CalendarWidget.vue'
import DashboardSectionsAllTradesSection from '~/components/dashboard/sections/AllTradesSection.vue'
import DashboardSectionsProfitTradesSection from '~/components/dashboard/sections/ProfitTradesSection.vue'
import DashboardSectionsLosingTradesSection from '~/components/dashboard/sections/LosingTradesSection.vue'
import DashboardSectionsWinLossComparisonSection from '~/components/dashboard/sections/WinLossComparisonSection.vue'
import DashboardSectionsRiskRatiosSection from '~/components/dashboard/sections/RiskRatiosSection.vue'
import DashboardSectionsDayStatisticsSection from '~/components/dashboard/sections/DayStatisticsSection.vue'

import {
    periodOptions,
    getPeriodDates,
    defaultGridItemsLg,
    defaultGridItemsMd,
    defaultGridItemsSm,
    resizableGridItems,
    type GridTemplateItem,
} from '~/utils/dashboard'
import { getDefaultSummaryState } from '~/stores/dbState'
import type { SettingsContentType } from '~/schema/user'
import { formatDateToYYYYMMDD } from '~/utils/date-utils'
import { OPERATOR_EQUAL, metadataHelpers } from '~/utils'
import type { Component } from 'vue'
import type { ChartKey, SectionKey, DashboardGridItem, WorkspaceConfig, WorkspaceId, TradeFilter, DashBoardFilters } from '~/type'
import { sectionKeys } from '~/type'
import { useMetricsChartRegistry } from '~/composables/metrics/useChartRegistry'
import { useMetricsSectionRegistry } from '~/composables/metrics/useSectionRegistry'

const { formatCurrency } = useUtils()

const userStore = useUserStore()
const dbStateStore = useDbStateStore()
const settings = userStore.user?.settings_object as SettingsContentType
const { fetchAccounts, fetchData, accounts, dashBoardLastTrades, dashBoardResult, clearLastTrades } = useDashboard()
const { displayModeNet } = useNetGrossDisplay()
const { tagGroups, fetchGroups } = useTags()
const chartsReady = ref(false)
const chartsCanRender = ref(false)
const gridReady = ref(false)
const { t, locale } = useI18n()
const { success: toastSuccess } = useAppToast()

const { getDefaultChartVisibility } = useMetricsChartRegistry()
const { getDefaultSectionVisibility } = useMetricsSectionRegistry()

const defaultChartVisibility = getDefaultChartVisibility()
const defaultSectionVisibility = getDefaultSectionVisibility()

// --- Workspace helpers (depuis useDashboardWorkspace composable) ---

const { workspaces, activeWorkspaceId, activeWorkspace, updateActiveWorkspace } = useDashboardWorkspace()
const breakdownInstances = useBreakdownInstances()

// Breakpoint detection: lg >= 1024, md >= 530, sm < 530
const currentBreakpoint = ref<'lg' | 'md' | 'sm'>('lg')

// Gestion de la visibilité des charts et sections via composable
const {
	chartVisibilityLg,
	chartVisibilityMd,
	chartVisibilitySm,
	sectionVisibilityLg,
	sectionVisibilityMd,
	sectionVisibilitySm,
	activeChartVisibility,
	activeSectionVisibility,
	isItemVisible: _isItemVisible,
	syncVisibilityToAllBreakpoints,
} = useGridVisibility(activeWorkspace, updateActiveWorkspace, currentBreakpoint)

// Items resizable : liste fixe + clés dynamiques des breakdowns
const allResizableItems = computed(() => [
    ...resizableGridItems,
    ...breakdownInstances.instanceKeys.value,
])

// Tous les items sont removables (bouton X)
// Pour les breakdowns : deleteInstance ; pour les charts/sections fixes : visibilité à false
const allRemovableItems = computed(() => {
    return gridLayout.value.map(item => item.i)
})

const onRemoveItem = (itemId: string) => {
    // Si c'est une instance de breakdown → deleteInstance
    if (breakdownInstances.instanceKeys.value.includes(itemId)) {
        breakdownInstances.deleteInstance(itemId)
        return
    }
    // Détermine si c'est une section ou un chart
    const isSection = sectionKeys.includes(itemId as SectionKey)

    const patch: Partial<WorkspaceConfig> = {}
    if (isSection) {
        // Section → dashboardSectionVisibility* (ne pas polluer dashboardChartVisibility*)
        patch.dashboardSectionVisibilityLg = { ...(activeWorkspace.value?.dashboardSectionVisibilityLg || {}), [itemId]: false } as Record<SectionKey, boolean>
        patch.dashboardSectionVisibilityMd = { ...(activeWorkspace.value?.dashboardSectionVisibilityMd || {}), [itemId]: false } as Record<SectionKey, boolean>
        patch.dashboardSectionVisibilitySm = { ...(activeWorkspace.value?.dashboardSectionVisibilitySm || {}), [itemId]: false } as Record<SectionKey, boolean>
    } else {
        // Chart → dashboardChartVisibility*
        patch.dashboardChartVisibilityLg = { ...(activeWorkspace.value?.dashboardChartVisibilityLg || {}), [itemId]: false }
        patch.dashboardChartVisibilityMd = { ...(activeWorkspace.value?.dashboardChartVisibilityMd || {}), [itemId]: false }
        patch.dashboardChartVisibilitySm = { ...(activeWorkspace.value?.dashboardChartVisibilitySm || {}), [itemId]: false }
    }
    updateActiveWorkspace(patch)
}

const switchWorkspace = async (id: WorkspaceId) => {
    if (id === activeWorkspaceId.value) return
    if (isGridDraggable.value) {
        pendingWorkspaceSwitch.value = id
        showUnsavedChangesModal.value = true
        return
    }
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

// Visibility logic now handled by useGridVisibility composable above

const gridComponents = computed(() => {
    // Map fixe pour les charts principaux et sections
    const fixedComponentMap: Record<string, Component> = {
        allTrades: DashboardSectionsAllTradesSection,
        profitTrades: DashboardSectionsProfitTradesSection,
        losingTrades: DashboardSectionsLosingTradesSection,
        winLossComparison: DashboardSectionsWinLossComparisonSection,
        riskRatios: DashboardSectionsRiskRatiosSection,
        dayStatistics: DashboardSectionsDayStatisticsSection,
    }
    // Map dynamique pour les instances de breakdown (clés dynamiques type breakdownBar_abc_123)
    const breakdownMap: Record<string, Component> = {}
    for (const key of breakdownInstances.instanceKeys.value) {
        // Les instances timeSeries utilisent le TimeSeriesWidget, calendar utilise CalendarWidget, les autres le BreakdownWidget
        if (key.startsWith('timeSeries')) {
            breakdownMap[key] = DashboardChartsTimeseriesTimeSeriesWidget
        } else if (key.startsWith('breakdownCalendar')) {
            breakdownMap[key] = DashboardChartsCalendarCalendarWidget
        } else {
            breakdownMap[key] = DashboardChartsBreakdownBreakdownWidget
        }
    }
    return { ...fixedComponentMap, ...breakdownMap }
})

// Props passées à chaque widget : itemId pour les breakdowns et timeSeries (clés dynamiques)
const breakdownComponentProps = computed(() => {
    const props: Record<string, { itemId: string, startingCapital?: number | null }> = {}
    for (const key of breakdownInstances.instanceKeys.value) {
        // Les instances timeSeries reçoivent le startingCapital (utilisé pour cumulatedPnl)
        if (key.startsWith('timeSeries')) {
            props[key] = { itemId: key, startingCapital: startingCapital.value }
        } else {
            props[key] = { itemId: key }
        }
    }
    return props
})

const gridLayoutRef = ref<{ getLayout: () => DashboardGridItem[] } | null>(null)

const updateBreakpoint = () => {
    const w = window.innerWidth
    if (w >= 1024) currentBreakpoint.value = 'lg'
    else if (w >= 530) currentBreakpoint.value = 'md'
    else currentBreakpoint.value = 'sm'
}

onMounted(() => {
    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
})

watch(currentBreakpoint, (bp) => {
    console.log('[Index] breakpoint changed:', bp)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateBreakpoint)
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

const defaultItemsForBreakpoint = computed(() => {
    switch (currentBreakpoint.value) {
        case 'md': return defaultGridItemsMd
        case 'sm': return defaultGridItemsSm
        default: return defaultGridItemsLg
    }
})

const gridLayout = computed(() => {
    const ws = activeWorkspace.value
    const breakpoint = currentBreakpoint.value
    const hasSavedLayout = breakpoint === 'md'
        ? (ws?.dashboardGridLayoutMd?.length ?? 0) > 0
        : breakpoint === 'sm'
            ? (ws?.dashboardGridLayoutSm?.length ?? 0) > 0
            : (ws?.dashboardGridLayout?.length ?? 0) > 0

    // If saved layout exists, use it and append any visible template item that is missing
    if (hasSavedLayout) {
        const baseLayout = breakpoint === 'md'
            ? ws!.dashboardGridLayoutMd
            : breakpoint === 'sm'
                ? ws!.dashboardGridLayoutSm
                : ws!.dashboardGridLayout
        const savedKeys = new Set(baseLayout.map(item => item.i))
        const visibleSaved = baseLayout.filter((item) => {
            if (item.i in activeChartVisibility.value) return activeChartVisibility.value[item.i as ChartKey]
            if (item.i in activeSectionVisibility.value) return activeSectionVisibility.value[item.i as SectionKey]
            return false
        })

        const templateItems = defaultItemsForBreakpoint.value
        const missingVisible = templateItems.filter((item) => {
            if (savedKeys.has(item.i)) return false
            if (item.i in activeChartVisibility.value) return activeChartVisibility.value[item.i as ChartKey]
            if (item.i in activeSectionVisibility.value) return activeSectionVisibility.value[item.i as SectionKey]
            return false
        })

        const cols = gridColNum.value
        const maxY = visibleSaved.reduce((max, item) => Math.max(max, (item.y ?? 0) + item.h), 0)
        const merged = [...visibleSaved]
        let currentX = 0
        let currentY = maxY
        let rowHeight = 0
        for (const item of missingVisible) {
            if (currentX + item.w > cols) {
                currentX = 0
                currentY += rowHeight
                rowHeight = 0
            }
            merged.push({ ...item, x: currentX, y: currentY })
            currentX += item.w
            rowHeight = Math.max(rowHeight, item.h)
        }
        return merged
    }

    // No saved layout: use templates and stack them
    const templateItems = defaultItemsForBreakpoint.value
    const visible = templateItems.filter((item) => {
        if (item.i in activeChartVisibility.value) return activeChartVisibility.value[item.i as ChartKey]
        if (item.i in activeSectionVisibility.value) return activeSectionVisibility.value[item.i as SectionKey]
        return false
    })

    const cols = gridColNum.value
    const compacted: (GridTemplateItem & { x: number; y: number })[] = []
    let currentX = 0
    let currentY = 0
    let rowHeight = 0

    for (const item of visible) {
        if (currentX + item.w > cols) {
            currentX = 0
            currentY += rowHeight
            rowHeight = 0
        }
        compacted.push({ ...item, x: currentX, y: currentY })
        currentX += item.w
        rowHeight = Math.max(rowHeight, item.h)
    }
    return compacted
})

const saveGridLayout = () => {
    const newLayout = gridLayoutRef.value?.getLayout()
    if (!newLayout) return
    // Use templates to find hidden items (they contain all possible items)
    const allItems = defaultItemsForBreakpoint.value
    const hiddenItems = allItems.filter((item) => {
        if (item.i in activeChartVisibility.value) return !activeChartVisibility.value[item.i as ChartKey]
        if (item.i in activeSectionVisibility.value) return !activeSectionVisibility.value[item.i as SectionKey]
        return false
    }).map(item => ({ ...item, x: 0, y: 0 })) // Add x/y for hidden items
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

// Deep clone a value to all other databases. structuredClone cannot handle
// Vue reactive proxies, so JSON is used instead.
async function cloneToAllDatabases<T>(source: T, perDb: Record<string, T>): Promise<Record<string, T>> {
	const { currentDatabase, databases, fetchDatabases } = useDatabase()
	const currentDbName = currentDatabase.value?.name || 'default'

	let dbs = databases.value
	if (dbs.length === 0) {
		dbs = await fetchDatabases()
	}

	const newPerDb = { ...perDb }
	for (const db of dbs) {
		if (db.name === currentDbName) continue
		newPerDb[db.name] = JSON.parse(JSON.stringify(source)) as T
	}
	return newPerDb
}

const syncDashboardToOtherDatabases = async () => {
	const { currentDatabase, databases, fetchDatabases } = useDatabase()
	const currentDbName = currentDatabase.value?.name || 'default'

	const sourceFilters = dbStateStore.dashBoardFiltersPerDb[currentDbName]
	if (!sourceFilters || !sourceFilters.workspaces) return

	let dbs = databases.value
	if (dbs.length === 0) {
		dbs = await fetchDatabases()
	}

	const newPerDb = { ...dbStateStore.dashBoardFiltersPerDb }
	const clonedWorkspaces = JSON.parse(JSON.stringify(sourceFilters.workspaces)) as WorkspaceConfig[]

	for (const db of dbs) {
		if (db.name === currentDbName) continue
		const existing = newPerDb[db.name]
		if (!existing) continue
		newPerDb[db.name] = { ...existing, workspaces: clonedWorkspaces }
	}

	dbStateStore.dashBoardFiltersPerDb = newPerDb

	toastSuccess(t('components.dashboard.index.sync_dashboard_success'))
}

const syncActiveWorkspaceToOtherDatabases = async () => {
	const ws = activeWorkspace.value
	if (!ws) return

	const { currentDatabase, databases, fetchDatabases } = useDatabase()
	const currentDbName = currentDatabase.value?.name || 'default'

	const sourceFilters = dbStateStore.dashBoardFiltersPerDb[currentDbName]
	if (!sourceFilters) return

	let dbs = databases.value
	if (dbs.length === 0) {
		dbs = await fetchDatabases()
	}

	const newPerDb = { ...dbStateStore.dashBoardFiltersPerDb }

	for (const db of dbs) {
		if (db.name === currentDbName) continue

		const existing = newPerDb[db.name]
		if (!existing) {
			// Unvisited database: bootstrap from current filters so the
			// workspace has a home.
			newPerDb[db.name] = JSON.parse(JSON.stringify(sourceFilters)) as DashBoardFilters
			continue
		}
		if (!existing.workspaces) {
			newPerDb[db.name] = { ...existing, workspaces: [JSON.parse(JSON.stringify(ws)) as WorkspaceConfig] }
			continue
		}

		const idx = existing.workspaces.findIndex(w => w.id === ws.id)
		const newWorkspaces = [...existing.workspaces]
		if (idx >= 0) {
			newWorkspaces[idx] = JSON.parse(JSON.stringify(ws)) as WorkspaceConfig
		} else {
			newWorkspaces.push(JSON.parse(JSON.stringify(ws)) as WorkspaceConfig)
		}
		newPerDb[db.name] = { ...existing, workspaces: newWorkspaces }
	}

	dbStateStore.dashBoardFiltersPerDb = newPerDb

	// Also sync chart settings (per-chart aggregation, display options, etc.)
	void dbStateStore.chartSettings // touch computed to init
	const sourceChartSettings = dbStateStore.chartSettingsPerDb[currentDbName]
	if (sourceChartSettings && Object.keys(sourceChartSettings).length > 0) {
		dbStateStore.chartSettingsPerDb = await cloneToAllDatabases(sourceChartSettings, dbStateStore.chartSettingsPerDb)
	}

	toastSuccess(t('components.dashboard.index.sync_workspace_success'))
}

const onSyncVisibilityToAllBreakpoints = (chartVisibility: Record<ChartKey, boolean>, sectionVisibility: Record<SectionKey, boolean>) => {
    syncVisibilityToAllBreakpoints(chartVisibility, sectionVisibility)
    toastSuccess(t('components.dashboard.index.sync_visibility_success'))
}

const onSaveAndSwitch = () => {
    saveGridLayout()
    isGridDraggable.value = false
    showUnsavedChangesModal.value = false
    const id = pendingWorkspaceSwitch.value
    pendingWorkspaceSwitch.value = null
    if (id) switchWorkspace(id)
}

const onDiscardAndSwitch = () => {
    isGridDraggable.value = false
    showUnsavedChangesModal.value = false
    const id = pendingWorkspaceSwitch.value
    pendingWorkspaceSwitch.value = null
    if (id) switchWorkspace(id)
}

const onCancelSwitch = () => {
    showUnsavedChangesModal.value = false
    pendingWorkspaceSwitch.value = null
}

const onResetLayout = () => {
    if (activeWorkspaceId.value === 'summary') {
        // Sur summary: restaure la configuration par défaut (visibilité + layout + configs)
        updateActiveWorkspace(getDefaultSummaryState())
    } else {
        // Autres workspaces: vide tout
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
    }
}

const formatValue = (value: number | undefined, decimals: number = 2): string => {
    if (value === undefined || value === null) return '---'
    if (!isFinite(value)) return '---'
    return value.toFixed(decimals)
}

const accountOptions = computed(() => {
    return accounts.value.map((account) => {
        return {
            value: account.id,
            label: account.displayName,
        }
    })
})

const startingCapital = computed(() => {
    const selectedAccountIds = dbStateStore.dashBoardFilters.accountIds
    let availableAccounts = accounts.value
    if (selectedAccountIds && selectedAccountIds.length > 0) {
        availableAccounts = accounts.value.filter((acc) => selectedAccountIds.includes(acc.id))
    }
    let totalCapital = 0
    for (const account of availableAccounts) {
        const capital = metadataHelpers.get<number>(account.metadata, 'startingCapital')
        if (capital !== null && capital !== undefined) {
            totalCapital += capital
        } else {
            return null
        }
    }
    return totalCapital
})

const filters = computed({
    get: () => dbStateStore.dashBoardFilters.filters || [{ column: 'symbol', operator: OPERATOR_EQUAL, value: '' }],
    set: (val) => (dbStateStore.dashBoardFilters.filters = val),
})

// Calculer le capital de départ en additionnant les capitaux des comptes sélectionnés



const startDateStr = computed({
    get: () => formatDateToYYYYMMDD(dbStateStore.dashBoardFilters.startDate),
    set: (value) => {
        const newDate = new Date(value)
        dbStateStore.dashBoardFilters.startDate = newDate
        dbStateStore.dashBoardFilters.customStartDate = newDate
        // Passer en mode custom si on modifie manuellement la date
        if (dbStateStore.dashBoardFilters.period !== 'custom') {
            dbStateStore.dashBoardFilters.period = 'custom'
        }
    },
})

const endDateStr = computed({
    get: () => formatDateToYYYYMMDD(dbStateStore.dashBoardFilters.endDate),
    set: (value) => {
        const newDate = new Date(value)
        dbStateStore.dashBoardFilters.endDate = newDate
        dbStateStore.dashBoardFilters.customEndDate = newDate
        // Passer en mode custom si on modifie manuellement la date
        if (dbStateStore.dashBoardFilters.period !== 'custom') {
            dbStateStore.dashBoardFilters.period = 'custom'
        }
    },
})

const fetchingDateRange = ref(false)

const setHistoryDateRange = async () => {
    fetchingDateRange.value = true
    try {
        const result = await $fetch('/api/trades/date-range', {
            query: {
                accountIds: JSON.stringify(dbStateStore.dashBoardFilters.accountIds),
            },
        }) as { minDate: string | null; maxDate: string | null }

        if (result.minDate && result.maxDate) {
            dbStateStore.dashBoardFilters.startDate = new Date(result.minDate)
            dbStateStore.dashBoardFilters.endDate = new Date(result.maxDate)
            dbStateStore.dashBoardFilters.customStartDate = new Date(result.minDate)
            dbStateStore.dashBoardFilters.customEndDate = new Date(result.maxDate)
            dbStateStore.dashBoardFilters.period = 'custom'
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
const showUnsavedChangesModal = ref(false)
const pendingWorkspaceSwitch = ref<WorkspaceId | null>(null)

// --- Workspace management ---

const workspaceRenameValue = ref(activeWorkspace.value?.name || '')

watch(activeWorkspace, (ws) => {
    workspaceRenameValue.value = ws?.name || ''
})

const emptyChartVisibility: Record<ChartKey, boolean> = Object.fromEntries(
    Object.keys(defaultChartVisibility).map(k => [k, false])
) as Record<ChartKey, boolean>
const emptySectionVisibility: Record<SectionKey, boolean> = Object.fromEntries(
    Object.keys(defaultSectionVisibility).map(k => [k, false])
) as Record<SectionKey, boolean>

// Default config for new workspaces - empty
const newWorkspaceChartVisibility = emptyChartVisibility
const newWorkspaceSectionVisibility = emptySectionVisibility

const newWorkspaceGridLayout: DashboardGridItem[] = []

const addWorkspace = () => {
    if (workspaces.value.length >= 5) return
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
    dbStateStore.dashBoardFilters = { ...dbStateStore.dashBoardFilters, workspaces: updated, activeWorkspaceId: id }
}

const removeWorkspace = (id: WorkspaceId) => {
    if (id === 'summary') return
    const updated = workspaces.value.filter(w => w.id !== id)
    const newActiveId = activeWorkspaceId.value === id ? 'summary' : activeWorkspaceId.value
    dbStateStore.dashBoardFilters = { ...dbStateStore.dashBoardFilters, workspaces: updated, activeWorkspaceId: newActiveId }
}

const renameActiveWorkspace = () => {
    const name = workspaceRenameValue.value.trim()
    if (!name || name === activeWorkspace.value?.name) return
    updateActiveWorkspace({ name })
}

const cancelRenameWorkspace = () => {
    workspaceRenameValue.value = activeWorkspace.value?.name || ''
}

// Fonction pour construire les filtres du dashboard
const buildDashboardFilters = (): TradeFilter[] => {
    return buildFiltersForApi(
        dbStateStore.dashBoardFilters.startDate,
        dbStateStore.dashBoardFilters.endDate,
        true,
        dbStateStore.dashBoardFilters.accountIds,
        filters.value
    )
}

// Utiliser le pattern générique pour la gestion des filtres
const {
    filterDirty,
    isAutoApplyMode,
    updateTradeCount,
    debouncedHandleFilterChange,
    onExplicitApply,
} = useFilteredPage({
    pageType: 'dashboard',
    onFetch: async () => {
        await onApplyFilters()
    },
    buildFiltersFn: buildDashboardFilters,
    debounceMs: 300,
})

const {
    filterLoading,
    load: onApplyFilters,
    loadDebounced: onApplyFiltersDebounced,
} = usePageDataManager({
    fetchFn: async () => {
        filterDirty.value = false
        const trades = await fetchData(
            dbStateStore.dashBoardFilters.startDate,
            dbStateStore.dashBoardFilters.endDate,
            true,
            dbStateStore.dashBoardFilters.accountIds,
            displayModeNet.value,
            filters.value
        )
        return trades
    },
    accounts,
    getAccountIds: () => dbStateStore.dashBoardFilters.accountIds,
    setAccountIds: (ids) => {
        dbStateStore.dashBoardFilters.accountIds = ids
    },
})

function resetFilters() {
    filters.value = []
    dbStateStore.dashBoardFilters.showAdvancedFilters = false
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
    () => dbStateStore.dashBoardFilters.period,
    (period) => {
        if (period === 'custom') {
            // En mode custom, utiliser les dates sauvegardées (convertir en Date si nécessaire)
            const cs = dbStateStore.dashBoardFilters.customStartDate
            const ce = dbStateStore.dashBoardFilters.customEndDate
            dbStateStore.dashBoardFilters.startDate = cs instanceof Date ? cs : new Date(cs)
            dbStateStore.dashBoardFilters.endDate = ce instanceof Date ? ce : new Date(ce)
        } else {
            // Pour les autres modes, calculer les dates selon la période
            const { start, end } = getPeriodDates(period)
            dbStateStore.dashBoardFilters.startDate = start ? start : new Date()
            dbStateStore.dashBoardFilters.endDate = end ? end : new Date()
        }
    },
    { immediate: true }
)

// Watcher unique pour les comptes (debounced) - sans deep pour éviter re-fetch KeepAlive
let lastAccountIds: number[] = []
watch(
    () => dbStateStore.dashBoardFilters.accountIds,
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
