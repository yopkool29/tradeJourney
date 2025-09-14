<template>
    <div>
        <UCard class="mb-4 md:max-w-4xl min-w-md">
            <div class="flex flex-col mb-4 gap-4">
                <div class="font-semibold">{{ $t('components.dashboard.index.accounts') }}</div>
                <USelect
                    v-model="userStore.dashBoardFilters.accountIds"
                    :items="accountOptions"
                    :placeholder="$t('components.dashboard.index.select_accounts')"
                    multiple
                    class="min-w-[200px] max-w-[300px] w-full"
                >
                    <div>
                        <span v-if="!userStore.dashBoardFilters.accountIds?.length">{{ $t('components.dashboard.index.all_accounts') }}</span>
                        <span v-else>{{
                            $t('components.dashboard.index.selected_accounts', { count: userStore.dashBoardFilters.accountIds?.length })
                        }}</span>
                    </div>
                </USelect>
            </div>
            <div class="flex flex-wrap gap-4 mb-4 items-end">
                <USelect
                    v-model="userStore.dashBoardFilters.period"
                    :items="periodOptions(locale)"
                    :placeholder="$t('components.dashboard.index.period')"
                    class="min-w-[200px] max-w-[300px] w-full"
                />
                <UInput v-model="startDateStr" type="date" class="w-36" />
                <UInput v-model="endDateStr" type="date" class="w-36" />
                <UButton icon="i-lucide-filter" :loading="filterLoading" color="primary" size="sm" @click="onApplyFilters">
                    {{ $t('components.dashboard.index.filter') }}
                </UButton>
            </div>
            <!-- Ligne d'options avancées -->
            <div class="flex flex-wrap gap-4 items-end">
                <div class="flex items-center gap-2">
                    <label for="cumule-mode-select" class="font-medium">{{ $t('components.dashboard.index.aggregation') }}</label>
                    <USelect
                        id="cumule-mode-select"
                        v-model="userStore.dashBoardFilters.cumuleMode"
                        :items="cumuleOptions"
                        class="min-w-[120px] max-w-[200px] w-full"
                    />
                </div>
            </div>
        </UCard>

        <div class="flex flex-col gap-4 max-w-5xl mb-8">
            <div class="flex font-semibold">{{ $t('components.dashboard.index.all_trades_period') }}</div>

            <!-- Overview : Cards (Nuxt UI) -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                <div class="bg-white dark:bg-gray-800 rounded shadow flex items-center justify-center gap-2 py-2">
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.dashboard.index.cumulated_pnl') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.cumulated_pnl_tooltip')" :ui="{ content: 'text-sm' }">
                        <span class="text-xl font-bold">{{ formatCurrency(userStore.dashBoardResult.pnl) }}</span>
                    </UTooltip>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded shadow flex items-center justify-center gap-2 py-2">
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.dashboard.index.appt') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.appt_tooltip')" :ui="{ content: 'text-sm' }">
                        <span class="text-xl font-bold">{{ formatCurrency(userStore.dashBoardResult.appt) }}</span>
                    </UTooltip>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded shadow flex items-center justify-center gap-2 py-2">
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.dashboard.index.pl_ratio') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.pl_ratio_tooltip')" :ui="{ content: 'text-sm' }">
                        <span class="text-xl font-bold">{{ userStore.dashBoardResult.plRatio?.toFixed(2) }}</span>
                    </UTooltip>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded shadow flex items-center justify-center gap-2 py-2">
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.dashboard.index.win_rate') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.win_rate_tooltip')" :ui="{ content: 'text-sm' }">
                        <span class="text-xl font-bold">{{ userStore.dashBoardResult.winrate?.toFixed(2) }}%</span>
                    </UTooltip>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded shadow flex items-center justify-center gap-2 py-2">
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.dashboard.index.profit_factor') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.profit_factor_tooltip')" :ui="{ content: 'text-sm' }">
                        <span class="text-xl font-bold">{{ userStore.dashBoardResult.profitFactor?.toFixed(2) }}</span>
                    </UTooltip>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded shadow flex items-center justify-center gap-2 py-2">
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.dashboard.index.recovery_factor') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.recovery_factor_tooltip')" :ui="{ content: 'text-sm' }">
                        <span class="text-xl font-bold">{{ userStore.dashBoardResult.recoveryFactor?.toFixed(2) }}</span>
                    </UTooltip>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded shadow flex items-center justify-center gap-2 py-2">
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('components.dashboard.index.sharpe_ratio') }}:</span>
                    <UTooltip :text="$t('components.dashboard.index.sharpe_ratio_tooltip')" :ui="{ content: 'text-sm' }">
                        <span class="text-xl font-bold">{{ userStore.dashBoardResult.sharpeRatio?.toFixed(2) }}</span>
                    </UTooltip>
                </div>
            </div>
        </div>

        <!-- Graphiques -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DashboardCumulatedPnlChart />
            <DashboardApptChart />
            <DashboardWinrateChart />
            <!-- <DashboardPlRatioChart /> -->
        </div>
    </div>
</template>

<script setup lang="ts">
import { periodOptions, getPeriodDates } from '~/utils/dashboard'
import { format } from 'date-fns'
import { formatCurrency } from '~/utils'

const userStore = useUserStore()
const { fetchAccounts, fetchDashboardData, accounts } = useDashboard()
const filterLoading = ref(false)
const { t, locale } = useI18n()

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

const startDateStr = computed({
    get: () => format(userStore.dashBoardFilters.startDate, 'yyyy-MM-dd'),
    set: (value) => {
        userStore.dashBoardFilters.startDate = new Date(value)
    },
})

const endDateStr = computed({
    get: () => format(userStore.dashBoardFilters.endDate, 'yyyy-MM-dd'),
    set: (value) => {
        userStore.dashBoardFilters.endDate = new Date(value)
    },
})

onMounted(async () => {
    await fetchAccounts()
})

const onApplyFilters = async () => {
    filterLoading.value = true
    try {
        await fetchDashboardData(
            userStore.dashBoardFilters.startDate,
            userStore.dashBoardFilters.endDate,
            true,
            userStore.dashBoardFilters.accountIds
        )
    } finally {
        filterLoading.value = false
    }
}

// Watcher sur la période
watch(
    () => userStore.dashBoardFilters.period,
    (period) => {
        const { start, end } = getPeriodDates(period)
        userStore.dashBoardFilters.startDate = start ? start : new Date()
        userStore.dashBoardFilters.endDate = end ? end : new Date()
    },
    { immediate: true }
)

// Vérifier que les comptes sélectionnés existent toujours
watch([() => userStore.dashBoardFilters.accountIds, accounts], ([currentIds, accountsList]) => {
    if (!currentIds?.length) return

    const validIds = currentIds.filter((id) => accountsList.some((account) => account.id === id))

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
</script>
