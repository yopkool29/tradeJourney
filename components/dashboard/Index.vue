<template>
    <div>
        <UCard class="card-container">
            <div class="filter-container">
                <div class="section-label">{{ $t('components.dashboard.index.accounts') }}</div>
                <USelect v-model="userStore.dashBoardFilters.accountIds" :items="accountOptions"
                    :placeholder="$t('components.dashboard.index.select_accounts')" multiple class="select-standard">
                    <div>
                        <span v-if="!userStore.dashBoardFilters.accountIds?.length">{{
                            $t('components.dashboard.index.all_accounts') }}</span>
                        <span v-else>{{
                            $t('components.dashboard.index.selected_accounts', {
                                count:
                                    userStore.dashBoardFilters.accountIds?.length
                            })
                            }}</span>
                    </div>
                </USelect>
            </div>
            <div class="filter-actions-lg mb-4">
                <USelect v-model="userStore.dashBoardFilters.period" :items="periodOptions(locale)"
                    :placeholder="$t('components.dashboard.index.period')" class="select-standard" />
                <UInput v-model="startDateStr" type="date" class="date-input" />
                <UInput v-model="endDateStr" type="date" class="date-input" />
                <UButton icon="i-lucide-filter" :loading="filterLoading" color="primary" size="sm"
                    @click="onApplyFilters">
                    {{ $t('components.dashboard.index.filter') }}
                </UButton>
            </div>
            <!-- Ligne d'options avancées -->
            <div class="filter-actions-lg">
                <div class="form-row">
                    <label for="cumule-mode-select" class="font-medium">{{ $t('components.dashboard.index.aggregation')
                        }}</label>
                    <USelect id="cumule-mode-select" v-model="userStore.dashBoardFilters.cumuleMode"
                        :items="cumuleOptions" class="min-w-[120px] max-w-[200px] w-full" />
                </div>
            </div>
        </UCard>

        <div class="flex flex-col gap-4 max-w-5xl mb-8">


            <!-- Overview : Cards (Nuxt UI) -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.trades_count') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.trades_count_tooltip')" :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ userStore.dashBoardResult.tradesCount }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.cumulated_pnl') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.cumulated_pnl_tooltip')"
                        :ui="{ content: 'text-sm' }" class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ formatCurrency(userStore.dashBoardResult.pnl) }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.expectancy') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.expectancy_tooltip')" :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ formatCurrency(userStore.dashBoardResult.appt) }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.pl_ratio') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.pl_ratio_tooltip')" :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ userStore.dashBoardResult.plRatio?.toFixed(2) }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.win_rate') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.win_rate_tooltip')" :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ userStore.dashBoardResult.winrate?.toFixed(2) }}%</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.profit_factor') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.profit_factor_tooltip')"
                        :ui="{ content: 'text-sm' }" class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ formatValue(userStore.dashBoardResult.profitFactor)
                            }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.recovery_factor') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.recovery_factor_tooltip')"
                        :ui="{ content: 'text-sm' }" class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ formatValue(userStore.dashBoardResult.recoveryFactor)
                            }}</span>
                    </UTooltip>
                </div>
                <div class="dashboard-card">
                    <span class="dashboard-card-label">{{ $t('components.dashboard.index.sharpe_ratio') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.sharpe_ratio_tooltip')" :ui="{ content: 'text-sm' }"
                        class="inline-flex items-center">
                        <span class="dashboard-card-value">{{ userStore.dashBoardResult.sharpeRatio?.toFixed(2)
                            }}</span>
                    </UTooltip>
                </div>
            </div>
        </div>

        <!-- Graphiques -->
        <div v-if="chartsReady" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <DashboardPnlBarChart />
            <DashboardCumulatedPnlChart2 :starting-capital="startingCapital" />
            <DashboardApptChart />
            <DashboardWinrateChart />
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

const { formatCurrency } = useUtils()

const userStore = useUserStore()
const settings = userStore.user?.settings_object as SettingsContentType
const { fetchAccounts, fetchDashboardData, accounts } = useDashboard()
const { displayModeNet } = useNetGrossDisplay()
const filterLoading = ref(false)
const chartsReady = ref(false)
const { t, locale } = useI18n()

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

// Calculer le capital de départ si un seul compte est sélectionné
const startingCapital = computed(() => {
    const selectedAccountIds = userStore.dashBoardFilters.accountIds

    // Vérifier qu'un seul compte est sélectionné
    if (!selectedAccountIds || selectedAccountIds.length !== 1) {
        return null
    }

    // Trouver le compte sélectionné
    const selectedAccount = accounts.value.find(acc => acc.id === selectedAccountIds[0])
    if (!selectedAccount) {
        return null
    }

    // Extraire le capital de départ depuis metadata
    const capital = metadataHelpers.get<number>(selectedAccount.metadata, 'startingCapital')
    return capital ?? null
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

onMounted(async () => {
    // Clear data if autoDataSync is enabled
    if (settings?.autoDataSync) {
        userStore.dashBoardFilters.last_results = []
    }

    nextTick(async () => {
        if (settings?.autoDataSync)
            filterLoading.value = true

        await fetchAccounts()

        // Fetch les données seulement si le tableau est vide (première visite ou après déconnexion)
        // Cela évite le flash visuel lors du remount du composant
        if (userStore.dashBoardFilters.last_results.length === 0) {
            await onApplyFilters()
        }

        // Activer le rendu des graphiques après un court délai pour ne pas bloquer le rendu initial
        setTimeout(() => {
            chartsReady.value = true
        }, 50)

        filterLoading.value = false

    })
})

const onApplyFilters = async () => {
    filterLoading.value = true
    try {
        await fetchDashboardData(
            userStore.dashBoardFilters.startDate,
            userStore.dashBoardFilters.endDate,
            true,
            userStore.dashBoardFilters.accountIds,
            displayModeNet.value
        )
    } finally {
        filterLoading.value = false
    }
}

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

// Vérifier que les comptes sélectionnés existent toujours
watch([() => userStore.dashBoardFilters.accountIds, accounts], ([currentIds, accountsList]) => {
    if (!currentIds?.length) return

    const validIds = currentIds.filter((id: number) => accountsList.some((account: AccountType) => account.id === id))

    if (validIds.length !== currentIds.length) {
        userStore.dashBoardFilters.accountIds = validIds.length ? validIds : []
    }
})

// Appliquer les filtres quand les comptes changent
watch(
    () => [...(userStore.dashBoardFilters.accountIds || [])],
    () => {
        onApplyFilters()
    },
    { deep: true }
)

// Relancer les filtres quand le mode d'affichage (Net/Brut) change
watch(
    () => displayModeNet.value,
    () => {
        onApplyFilters()
    }
)
</script>
