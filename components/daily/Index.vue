<template>
    <div>
        <!-- Filtres simplifiés : compte + mois -->
        <UCard class="card-container-xl">
            <template #default>
                <div class="flex items-start justify-between">
                    <div class="flex flex-col">
                        <CommonTradeFilters
                            v-model:account-ids="dbStateStore.dailyFilters.accountIds"
                            v-model:show-inactive="dbStateStore.dailyFilters.showInactive"
                            v-model:filters="filters"
                            v-model:show-advanced-filters="dbStateStore.dailyFilters.showAdvancedFilters"
                            v-model:last-filter-column="dbStateStore.dailyFilters.lastFilterColumn"
                            :title="$t('components.daily.index.accounts')"
                            slot-id="page-daily"
                            :show-plugin-slot="false"
                            :filter-loading="filterLoading"
                            :account-options="accountOptions"
                            :placeholder="$t('components.daily.index.select_accounts')"
                            :all-label="$t('components.daily.index.all_accounts')"
                            :selected-label="$t('components.daily.index.selected_accounts', { count: dbStateStore.dailyFilters.accountIds?.length })"
                            :show-inactive-checkbox="true"
                            :tag-groups="tagGroups"
                            :dirty="filterDirty"
                            @apply="onExplicitApply"
                            @reset="resetFilters"
                            @remove="(isLast) => { if (isLast) onExplicitApply() }">
                            <template #after-accounts>
                                <div class="filter-actions-lg">
                                    <UInput :model-value="selectedMonth" type="month" class="w-36" @change="(e: Event) => { selectedMonth = (e.target as HTMLInputElement).value }" />
                                    <UButton icon="i-lucide-calendar-clock" size="xs" variant="ghost" color="neutral"
                                        :title="$t('components.dashboard.index.set_history_range')"
                                        :loading="fetchingDateRange"
                                        @click="setHistoryDateRange" />
                                    <UButton :icon="isExpanded ? 'i-lucide-minimize-2' : 'i-lucide-expand'" color="primary"
                                        size="sm" :loading="expandLoading" @click="onExpand">
                                        {{ isExpanded ? $t('components.daily.index.collapse') :
                                            $t('components.daily.index.expand') }}
                                    </UButton>
                                </div>
                            </template>
                        </CommonTradeFilters>
                    </div>
                    <div class="flex flex-col items-start gap-2">
                        <PluginPageSlot slot-id="page-daily" />
                        <CommonPnLCalendar
                            v-model="calendarValue"
                            :month="calendarMonth"
                            :day-stats="dayStats"
                            :show="settings.showCalendarDaily"
                            @update:month="onCalendarMonthChange"
                        />
                    </div>
                </div>
            </template>
        </UCard>
        <div class="flex flex-col-reverse md:flex-row md:gap-8 items-start">
            <div class="w-full">
                <div v-if="!filteredGroups.length">
                    <div class="py-8 text-center text-gray-500 dark:text-gray-400">
                        <div class="text-lg mb-2">{{ $t('components.daily.index.no_history') }}</div>
                    </div>
                </div>
                <template
                    v-for="(group, index) in displayGroups"
                    v-else-if="groupsReady"
                    :key="group.key">
                    <DailyTradeGroup :show-table="expandedGroups[group.key]" :group-date="group.day"
                        :group-trades="[...group.trades].sort((a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime())"
                        :index="index" @update:show-table="(val) => { expandedGroups = { ...expandedGroups, [group.key]: val } }"
                        @trade-status-changed="onTradeStatusChanged" />
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import type { TradeExtendedType } from '~/schema/trade'
import type { SettingsContentType } from '~/schema/user'
import { formatDateToYYYYMMDD } from '~/utils/date-utils'
import type { TradeFilter } from '~/type'

const userStore = useUserStore()
const dbStateStore = useDbStateStore()
const settings = userStore.user?.settings_object as SettingsContentType
const showDialog = ref(false)
const dialogGroup = ref<TradeGroup | null>(null)
const { fetchSymbols } = useSymbols()
const { fetchDayTags } = useDayTags()
const { tagGroups, fetchGroups } = useTags()
const isInitialLoad = ref(true)
const refreshTrigger = ref(0)
const groupsReady = ref(false)

// Force le recalcul de dayStats quand le statut d'un trade change (active/inactive)
// displayResults est un shallowRef, donc les mutations d'objets ne déclenchent pas de re-render
const onTradeStatusChanged = () => {
    refreshTrigger.value++
}

const expandedGroups = shallowRef<{ [key: string]: boolean }>({})

const isExpanded = computed({
    get: () => dbStateStore.dailyFilters.isExpanded,
    set: (val) => dbStateStore.dailyFilters.isExpanded = val
})

type TradeGroup = { key: string; count: number; day: Date; trades: TradeExtendedType[]; pnl: number; commission: number }
type TradeGroups = { [key: string]: TradeGroup }

const { accounts, dailyLastTrades, fetchAccounts, fetchData, clearLastTrades } = useDailyHistory()

const accountOptions = computed(() => {
    return accounts.value.map((account) => {
        return {
            value: account.id,
            label: account.displayName,
        }
    })
})

const selectedMonth = computed({
    get: () => dbStateStore.dailyFilters.selectedMonth,
    set: (value) => (dbStateStore.dailyFilters.selectedMonth = value),
})

const fetchingDateRange = ref(false)

const setHistoryDateRange = async () => {
    fetchingDateRange.value = true
    try {
        const result = await $fetch('/api/trades/date-range', {
            query: {
                accountIds: JSON.stringify(dbStateStore.dailyFilters.accountIds)
            }
        })

        if (result.maxDate) {
            const date = new Date(result.maxDate)
            const year = date.getFullYear()
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            selectedMonth.value = `${year}-${month}`
        }
    } catch (error) {
        console.error('Error fetching date range:', error)
    } finally {
        fetchingDateRange.value = false
    }
}

const displayMonth = ref(dbStateStore.dailyFilters.selectedMonth)
const dataStore = useDataStore()
const displayResults = shallowRef<TradeExtendedType[]>(dailyLastTrades.value)

const calendarMonth = computed(() => {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    return { year, month }
})

const calendarValue = ref<unknown>(null)

const { filterLoading, load: loadMonthData, loadDebounced: loadMonthDataDebounced } = usePageDataManager({
    fetchFn: async () => {
        await applyDaysTags()
        await applyCalendar(selectedMonth.value)
    },
    onAfterFetch: () => {
        const monthChanged = selectedMonth.value !== displayMonth.value
        displayResults.value = dailyLastTrades.value
        displayMonth.value = selectedMonth.value
        if (monthChanged) expandedGroups.value = {}
    },
    accounts,
    getAccountIds: () => dbStateStore.dailyFilters.accountIds,
    setAccountIds: (ids) => { dbStateStore.dailyFilters.accountIds = ids },
})

const { t: _t, locale: _locale } = useI18n()

const filters = computed({
    get: () => dbStateStore.dailyFilters.filters || [],
    set: (val) => dbStateStore.dailyFilters.filters = val
})

// Fonction pour construire les filtres du daily (convertit selectedMonth en dates)
const buildDailyFilters = (): TradeFilter[] => {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = endOfMonth(startDate)

    return buildFiltersForApi(
        startDate,
        endDate,
        true,
        dbStateStore.dailyFilters.accountIds,
        filters.value
    )
}

// Utiliser le pattern générique pour la gestion des filtres
const {
    filterDirty,
    debouncedHandleFilterChange,
    onExplicitApply,
} = useFilteredPage({
    pageType: 'daily',
    onFetch: async () => {
        await loadMonthDataDebounced()
    },
    buildFiltersFn: buildDailyFilters,
    debounceMs: 300,
})

function resetFilters() {
    filters.value = []
    dbStateStore.dailyFilters.showAdvancedFilters = false
    loadMonthDataDebounced()
}

const getDaysStats = () => {
    // Dépendre de refreshTrigger pour forcer le recalcul quand on l'incrémente
    void refreshTrigger.value

    const trades = displayResults.value as TradeExtendedType[]

    if (!displayMonth.value)
        return {}

    const [year, month] = displayMonth.value.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = endOfMonth(start)

    // Extraire accountIds en Set pour O(1) lookup
    const accountIds = dbStateStore.dailyFilters.accountIds
    const accountIdSet = new Set(accountIds)
    const allAccounts = accountIds.length === 0 || accountIdSet.has(-1)

    // Filtrage + pre-indexation par jour en un seul passage O(n)
    const tradesByDay: Record<string, TradeExtendedType[]> = {}
    for (const trade of trades) {
        const closeDate = trade.closeDate
        if (closeDate < start || closeDate > end) continue
        if (!allAccounts && !accountIdSet.has(trade.accountId)) continue
        const key = formatDateToYYYYMMDD(closeDate)
        if (!tradesByDay[key]) tradesByDay[key] = []
        tradesByDay[key].push(trade)
    }

    // Grouper par jour
    const stats: TradeGroups = {}
    eachDayOfInterval({ start, end }).forEach((day) => {
        const key = formatDateToYYYYMMDD(day)
        const tradesOfDay = tradesByDay[key] || []
        const activeTradesOfDay = tradesOfDay.filter((trade) => trade.active !== false)
        const pnl = activeTradesOfDay.reduce((sum, t) => sum + (t.netProfit || 0), 0)
        const commission = activeTradesOfDay.reduce((sum, t) => sum + (t.commission || 0), 0)
        stats[key] = {
            count: activeTradesOfDay.length,
            day: day,
            pnl,
            commission,
            key: key,
            trades: tradesOfDay,
        }
    })
    return stats
}

// Calcul des trades du mois sélectionné et stats par jour
const dayStats = computed(() => {
    return getDaysStats()
})

// Extraction des groupes avec au moins un trade pour éviter la duplication de code
const filteredGroups = computed(() => {
    const showInactive = dbStateStore.dailyFilters.showInactive
    return Object.values(dayStats.value).filter((g) => showInactive ? g.trades.length > 0 : g.count > 0)
})

const displayGroups = computed(() => {
    const groups = filteredGroups.value
    return settings?.reverseDaysOrder ? groups : [...groups].reverse()
})

const expandLoading = ref(false)

const onExpand = () => {
    expandLoading.value = true
    setTimeout(() => {
        const newExpanded = !isExpanded.value
        isExpanded.value = newExpanded
        const groups = filteredGroups.value
        const newExpandedGroups: { [key: string]: boolean } = {}
        for (let i = 0; i < groups.length; i++) {
            newExpandedGroups[groups[i].key] = newExpanded
        }
        expandedGroups.value = newExpandedGroups
        requestAnimationFrame(() => {
            expandLoading.value = false
        })
    })
}

const onCalendarMonthChange = (...args: unknown[]) => {
    const month = args[0] as { year: number; month: number }
    selectedMonth.value = `${month.year}-${month.month.toString().padStart(2, '0')}`
}

const setDialogToFirstTradingDay = () => {
    // Cherche la première journée avec trade dans les groupes filtrés (utilise le cached dayStats)
    const groups = filteredGroups.value
    const first = groups.find((g) => g.count > 0)
    if (first) {
        dialogGroup.value = first
        showDialog.value = true
    }
    // Ne pas fermer le dialog s'il n'y a pas de données (évite le clignotement pendant le chargement)
}

async function applyCalendar(val: string, forceFetch: boolean = true) {
    if (val) {
        const [year, month] = val.split('-').map(Number)
        calendarValue.value = new CalendarDate(year, month, 1)
        const startDate = startOfMonth(selectedMonth.value)
        const endDate = endOfMonth(startDate)
        if (forceFetch) {
            await fetchData(startDate, endDate, true, dbStateStore.dailyFilters.accountIds, filters.value)
            // Laisser le browser respirer avant le rendu des groupes
            await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)))
        }
    }
}

async function applyDaysTags(forceFetch: boolean = true) {
    if (forceFetch) {
        await fetchDayTags(selectedMonth.value)
    }
}

// const mountStart = performance.now()

onMounted(() => {
    // Clear data if autoDataSync is enabled
    if (settings?.autoDataSync) {
        clearLastTrades()
    }

    filterLoading.value = true

    // Lancer les requêtes en background sans bloquer le rendu
    Promise.all([
        fetchSymbols(),
        fetchAccounts(),
        fetchGroups()
    ]).then(async () => {
        const needForceCalendar = dailyLastTrades.value.length === 0
        // Paralléliser les deux requêtes indépendantes
        await Promise.all([
            applyDaysTags(true),
            applyCalendar(selectedMonth.value, needForceCalendar)
        ])

        displayResults.value = dailyLastTrades.value
        displayMonth.value = selectedMonth.value

        if (userStore.shouldRefreshData() && (dbStateStore.dayTags.length > 0 || dataStore.dailyLastTrades.length > 0)) {
            await loadMonthData()
            userStore.clearDataRefresh()
        }

        if (!settings?.autoDataSync) {
            refreshTrigger.value++
        }

        filterLoading.value = false
        isInitialLoad.value = false
    })

    // Afficher les groupes après le premier paint pour éviter le blocage initial
    requestAnimationFrame(() => {
        setTimeout(() => {
            groupsReady.value = true
        }, 0)
    })
})

// Watcher pour les comptes (debounced)
watch(
    () => [...(dbStateStore.dailyFilters.accountIds || [])],
    () => debouncedHandleFilterChange(),
    { deep: true }
)

// Watcher pour showInactive (debounced)
watch(
    () => dbStateStore.dailyFilters.showInactive,
    () => debouncedHandleFilterChange()
)

// Watcher pour selectedMonth (debounced)
watch(selectedMonth, () => debouncedHandleFilterChange())

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

// Relancer le fetch quand la base de données change
const { currentDatabase } = useDatabase()
watch(currentDatabase, (newDb, oldDb) => {
    if (newDb && oldDb && newDb.id !== oldDb.id) {
        loadMonthData()
    }
})

// Ouvrir le dialog automatiquement au premier chargement
// et restaurer l'état replier/déplier depuis le store
watch(filteredGroups, (groups) => {
    if (groups.length > 0 && isExpanded.value) {
        const restored: { [key: string]: boolean } = {}
        for (let i = 0; i < groups.length; i++) {
            restored[groups[i].key] = true
        }
        expandedGroups.value = restored
    }
    if (isInitialLoad.value && groups.length > 0) {
        nextTick(() => {
            setDialogToFirstTradingDay()
            isInitialLoad.value = false
        })
    }
}, { immediate: true })
</script>
