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
                    <span class="dashboard-card-value" :title="$t('components.dashboard.index.profit_factor_tooltip')">{{ formatNumberValue(dashBoardResult.profitFactor) }}</span>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.recovery_factor') }}:</span>
                    <span class="dashboard-card-value" :title="$t('components.dashboard.index.recovery_factor_tooltip')">{{ formatNumberValue(dashBoardResult.recoveryFactor) }}</span>
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
import {
    periodOptions,
    resizableGridItems,
} from '~/utils/dashboard'
import type { SettingsContentType } from '~/schema/user'
import { OPERATOR_EQUAL } from '~/utils'
import { formatNumberValue } from '~/utils/formatNumberValue'
import type { ChartKey, SectionKey, WorkspaceConfig, WorkspaceId } from '~/type'
import { getDashboardGridComponents, getDashboardComponentProps, useDashboardBreakpoint, useDashboardGridLayout } from '~/composables/dashboard/useDashboardGridLayout'
import { useDashboardFilters } from '~/composables/dashboard/useDashboardFilters'
import { useDashboardLayoutPersistence } from '~/composables/dashboard/useDashboardLayoutPersistence'
import { useDashboardWorkspaceSwitch } from '~/composables/dashboard/useDashboardWorkspaceSwitch'
import { useDashboardData } from '~/composables/dashboard/useDashboardData'
import { sectionKeys } from '~/type'
const { formatCurrency } = useUtils()

const userStore = useUserStore()
const dbStateStore = useDbStateStore()
const { fetchAccounts, accounts, dashBoardLastTrades, dashBoardResult, clearLastTrades } = useDashboard()
const { displayModeNet } = useNetGrossDisplay()
const { tagGroups, fetchGroups } = useTags()
const chartsReady = ref(false)
const chartsCanRender = ref(false)
const gridReady = ref(false)
const { t, locale } = useI18n()
const { success: toastSuccess } = useAppToast()

// --- Workspace helpers (depuis useDashboardWorkspace composable) ---

const {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    updateActiveWorkspace,
    workspaceRenameValue,
    addWorkspace,
    removeWorkspace,
    renameActiveWorkspace,
    cancelRenameWorkspace,
    resetLayout: onResetLayout,
    syncDashboardToOtherDatabases,
    syncActiveWorkspaceToOtherDatabases,
} = useDashboardWorkspace()
const breakdownInstances = useBreakdownInstances()

const { currentBreakpoint } = useDashboardBreakpoint()

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

const gridComponents = computed(() => getDashboardGridComponents(breakdownInstances.instanceKeys.value))

const { gridColNum, defaultItemsForBreakpoint, gridLayout } = useDashboardGridLayout(
    activeWorkspace,
    activeChartVisibility,
    activeSectionVisibility,
    currentBreakpoint,
)
const { gridLayoutRef, saveGridLayout } = useDashboardLayoutPersistence(
    defaultItemsForBreakpoint,
    activeChartVisibility,
    activeSectionVisibility,
    currentBreakpoint,
    updateActiveWorkspace,
)

const isGridDraggable = ref(false)

const {
    switchingToWorkspaceId,
    showUnsavedChangesModal,
    switchWorkspace: switchWorkspaceBase,
    onSaveAndSwitch: onSaveAndSwitchBase,
    onDiscardAndSwitch: onDiscardAndSwitchBase,
    onCancelSwitch,
} = useDashboardWorkspaceSwitch(isGridDraggable, saveGridLayout)

const switchWorkspace = (id: WorkspaceId) => switchWorkspaceBase(id, activeWorkspaceId)
const onSaveAndSwitch = () => onSaveAndSwitchBase(activeWorkspaceId)
const onDiscardAndSwitch = () => onDiscardAndSwitchBase(activeWorkspaceId)

const onSyncVisibilityToAllBreakpoints = (chartVisibility: Record<ChartKey, boolean>, sectionVisibility: Record<SectionKey, boolean>) => {
    syncVisibilityToAllBreakpoints(chartVisibility, sectionVisibility)
    toastSuccess(t('components.dashboard.index.sync_visibility_success'))
}

const filters = computed({
    get: () => dbStateStore.dashBoardFilters.filters || [{ column: 'symbol', operator: OPERATOR_EQUAL, value: '' }],
    set: (val) => (dbStateStore.dashBoardFilters.filters = val),
})

const {
    accountOptions,
    startingCapital,
    filterDirty,
    isAutoApplyMode,
    updateTradeCount,
    debouncedHandleFilterChange,
    onExplicitApply,
    filterLoading,
    onApplyFilters,
    onApplyFiltersDebounced,
    resetFilters,
} = useDashboardData(filters, accounts)

const breakdownComponentProps = computed(() =>
    getDashboardComponentProps(breakdownInstances.instanceKeys.value, startingCapital.value),
)

const { startDateStr, endDateStr, fetchingDateRange, setHistoryDateRange } = useDashboardFilters({
    filters,
    filterLoading,
    isAutoApplyMode,
    displayModeNet,
    debouncedHandleFilterChange,
    onApplyFiltersDebounced,
})

onMounted(() => {
    // Clear data if autoDataSync is enabled
    const settings = userStore.user?.settings_object as SettingsContentType
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

</script>
