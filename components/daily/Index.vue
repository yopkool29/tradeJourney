<template>
    <div>
        <!-- Filtres simplifiés : compte + mois -->
        <UCard class="card-container-xl">
            <template #default>
                <div class="flex items-start justify-between">
                    <div class="flex flex-col">
                        <CommonTradeFilters :title="$t('components.daily.index.accounts')" slot-id="page-daily"
                            :show-plugin-slot="false" v-model:account-ids="userStore.dailyHistoryFilters.accountIds"
                            v-model:show-inactive="userStore.dailyHistoryFilters.showInactive" v-model:filters="filters"
                            v-model:show-advanced-filters="userStore.dailyHistoryFilters.showAdvancedFilters"
                            :filter-loading="filterLoading" :account-options="accountOptions"
                            :placeholder="$t('components.daily.index.select_accounts')"
                            :all-label="$t('components.daily.index.all_accounts')"
                            :selected-label="$t('components.daily.index.selected_accounts', { count: userStore.dailyHistoryFilters.accountIds?.length })"
                            :filterable-columns-config="filterableColumnsConfig" :show-inactive-checkbox="true" :tag-groups="tagGroups"
                            v-model:last-filter-column="userStore.dailyHistoryFilters.lastFilterColumn"
                            @apply="onApplyFilters" @reset="resetFilters">
                            <template #after-accounts>
                                <div class="filter-actions-lg">
                                    <UInput :model-value="selectedMonth" type="month" class="w-36" @change="(e: Event) => { selectedMonth = (e.target as HTMLInputElement).value }" />
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
                    v-else
                    v-for="(group, index) in (settings?.reverseDaysOrder ? filteredGroups : [...filteredGroups].reverse())"
                    :key="group.key">
                    <DailyTradeGroup :show-table="expandedGroups[group.key]" :group-date="group.day"
                        :group-trades="[...group.trades].sort((a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime())"
                        :index="index" @update:show-table="(val) => { expandedGroups = { ...expandedGroups, [group.key]: val } }" />
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
import type { TradeFilter, FilterColumn } from '~/type'
import {
    OPERATOR_EQUAL,
    OPERATOR_NOT_EQUAL,
    OPERATOR_GREATER_THAN_OR_EQUAL,
    OPERATOR_IN,
} from '~/utils'

const userStore = useUserStore()
const settings = userStore.user?.settings_object as SettingsContentType
const showDialog = ref(false)
const dialogGroup = ref<TradeGroup | null>(null)
const { fetchSymbols } = useSymbols()
const { fetchDayTags } = useDayTags()
const { tagGroups } = useTags()
const isInitialLoad = ref(true)
const refreshTrigger = ref(0)

const expandedGroups = shallowRef<{ [key: string]: boolean }>({})

const isExpanded = computed({
    get: () => userStore.dailyHistoryFilters.isExpanded,
    set: (val) => userStore.dailyHistoryFilters.isExpanded = val
})

type TradeGroup = { key: string; count: number; day: Date; trades: TradeExtendedType[]; pnl: number; commission: number }
type TradeGroups = { [key: string]: TradeGroup }

const { accounts, lastResults, fetchAccounts, fetchData } = useDailyHistory()

const accountOptions = computed(() => {
    return accounts.value.map((account) => {
        return {
            value: account.id,
            label: account.displayName,
        }
    })
})

const selectedMonth = computed({
    get: () => userStore.dailyHistoryFilters.selectedMonth,
    set: (value) => (userStore.dailyHistoryFilters.selectedMonth = value),
})

const displayMonth = ref(userStore.dailyHistoryFilters.selectedMonth)
const displayResults = shallowRef<TradeExtendedType[]>(userStore.dailyHistoryFilters.last_results as TradeExtendedType[])

const calendarMonth = computed(() => {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    return { year, month }
})

const calendarValue = ref<any>(null)

const { filterLoading, load: loadMonthData, loadDebounced: loadMonthDataDebounced } = usePageDataManager({
    fetchFn: async () => {
        await applyDaysTags()
        await applyCalendar(selectedMonth.value)
    },
    onAfterFetch: () => {
        const monthChanged = selectedMonth.value !== displayMonth.value
        displayResults.value = lastResults.value
        displayMonth.value = selectedMonth.value
        if (monthChanged) expandedGroups.value = {}
    },
    accounts,
    getAccountIds: () => userStore.dailyHistoryFilters.accountIds,
    setAccountIds: (ids) => { userStore.dailyHistoryFilters.accountIds = ids },
})

const { t, locale } = useI18n()

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
    get: () => userStore.dailyHistoryFilters.filters || [],
    set: (val) => userStore.dailyHistoryFilters.filters = val
})

function resetFilters() {
    filters.value = []
    userStore.dailyHistoryFilters.showAdvancedFilters = false
    loadMonthDataDebounced()
}

function onApplyFilters() {
    loadMonthDataDebounced()
}

const getDaysStats = () => {
    // Dépendre de refreshTrigger pour forcer le recalcul quand on l'incrémente
    refreshTrigger.value

    const trades = displayResults.value as TradeExtendedType[]

    if (!displayMonth.value)
        return {}

    const [year, month] = displayMonth.value.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = endOfMonth(start)

    // Extraire accountIds en Set pour O(1) lookup
    const accountIds = userStore.dailyHistoryFilters.accountIds
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
    return Object.values(dayStats.value).filter((g) => g.trades.length > 0)
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
            await fetchData(startDate, endDate, true, userStore.dailyHistoryFilters.accountIds, filters.value)
        }
    }
}

async function applyDaysTags(forceFetch: boolean = true) {
    if (forceFetch) {
        await fetchDayTags(selectedMonth.value)
    }
}

// const mountStart = performance.now()

onMounted(async () => {
    // Clear data if autoDataSync is enabled
    if (settings?.autoDataSync)
        userStore.dailyHistoryFilters.last_results = []

    // Charger les données en arrière-plan sans bloquer le rendu
    nextTick(async () => {
        if (settings?.autoDataSync)
            filterLoading.value = true

        await fetchSymbols()
        await fetchAccounts()

        // Déterminer si on doit forcer le chargement des données
        const needForceCalendar = userStore.dailyHistoryFilters.last_results.length === 0

        // Toujours charger les dayTags pour le mois sélectionné
        await applyDaysTags(true)

        // Charger les données du calendrier si nécessaire
        await applyCalendar(selectedMonth.value, needForceCalendar)

        displayResults.value = lastResults.value
        
        displayMonth.value = selectedMonth.value

        // Forcer la réactivité UNIQUEMENT après une reconnexion
        if (userStore.shouldRefreshData() && (userStore.dayTags.length > 0 || userStore.dailyHistoryFilters.last_results.length > 0)) {
            await loadMonthData()
            userStore.clearDataRefresh()
        }

        if (!settings?.autoDataSync)
            refreshTrigger.value++

        filterLoading.value = false
        isInitialLoad.value = false
    })
})

// Appliquer les filtres quand les comptes changent
watch(
    () => [...(userStore.dailyHistoryFilters.accountIds || [])],
    () => {
        loadMonthDataDebounced()
    },
    { deep: true }
)

// Appliquer les filtres quand showInactive change
watch(
    () => userStore.dailyHistoryFilters.showInactive,
    () => {
        loadMonthDataDebounced()
    }
)

// Synchronisation bidirectionnelle : quand selectedMonth change, on charge les données
watch(selectedMonth, () => {
    loadMonthDataDebounced()
})

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
