<template>
    <div>
        <!-- Filtres simplifiés : compte + mois -->
        <UCard class="mb-4 md:max-w-4xl min-w-md">
            <div class="flex flex-col mb-4 gap-4">
                <div class="flex items-center justify-between">
                    <div class="font-semibold">{{ $t('components.daily.index.accounts') }}</div>
                    <PluginPageSlot slot-id="page-daily" />
                </div>
                <CommonAccountSelect
                    v-model="userStore.dailyHistoryFilters.accountIds"
                    :items="accountOptions"
                    :placeholder="$t('components.daily.index.select_accounts')"
                    :all-label="$t('components.daily.index.all_accounts')"
                    :selected-label="$t('components.daily.index.selected_accounts', { count: userStore.dailyHistoryFilters.accountIds?.length })"
                    select-class="min-w-[200px] max-w-[300px] w-full"
                />
            </div>
            <div class="flex gap-4 justify-between items-end">
                <div class="flex flex-wrap gap-4 mb-2 items-end">
                    <UInput v-model="userStore.dailyHistoryFilters.selectedMonth" type="month" class="w-36" />
                    <UButton :loading="filterLoading" icon="i-lucide-filter" color="primary" size="sm"
                        @click="onFilter">{{
                            $t('components.daily.index.filter')
                        }}</UButton>
                    <UButton :icon="isExpanded ? 'i-lucide-minimize-2' : 'i-lucide-expand'" color="primary" size="sm"
                        @click="onExpand">
                        {{ isExpanded ? $t('components.daily.index.collapse') : $t('components.daily.index.expand') }}
                    </UButton>
                    <UCheckbox v-model="userStore.dailyHistoryFilters.showInactive" class="mt-2"
                        :label="$t('components.trade.table.show_inactive')" />
                </div>
            </div>
        </UCard>
        <!-- Calendrier mensuel Nuxt UI customisé -->
        <div class="flex flex-col-reverse md:flex-row md:gap-8 items-start">
            <div :class="{
                'w-full': !settings.showCalendarDaily,
                'w-full md:w-2/3 xl:w-3/4 2xl:w-[calc(100%-300px)]': settings.showCalendarDaily
            }">
                <div v-if="!filteredGroups.length">
                    <div class="py-8 text-center text-gray-500 dark:text-gray-400">
                        <div class="text-lg mb-2">{{ $t('components.daily.index.no_history') }}</div>
                    </div>
                </div>
                <template v-for="(group, index) in (settings?.reverseDaysOrder ? filteredGroups : [...filteredGroups].reverse())" v-else :key="group.key">
                    <DailyTradeGroup v-model:show-table="expandedGroups[group.key]" :group-date="group.day"
                        :group-trades="[...group.trades].sort((a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime())"
                        :index="index" />
                </template>
            </div>
            <!-- Colonne droite : Calendrier -->
            <div v-if="settings.showCalendarDaily"
                class="px-2 border-2 border-gray-300 md:sticky md:top-4 md:self-start min-w-[250px]">
                <UCalendar v-model="calendarValue" :month="calendarMonth" :month-controls="true" :year-controls="false"
                    readonly class="mb-8" size="xl" @update:placeholder="onCalendarMonthChange">
                    <template #day="{ day }">
                        <div class="flex flex-col items-center justify-center w-full h-full rounded p-1" :class="{
                            'bg-green-300 text-green-900': dayStats[day.toString()]?.pnl > 0,
                            'bg-red-300 text-red-900': dayStats[day.toString()]?.pnl < 0,
                        }">
                            <span>{{ day.day }}</span>
                        </div>
                    </template>
                </UCalendar>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { useDebounceFn } from '@vueuse/core'
import type { TradeExtendedType } from '~/schema/trade'
import type { SettingsContentType } from '~/schema/user'
import { formatDateToYYYYMMDD } from '~/utils/date-utils'

const userStore = useUserStore()
const settings = userStore.user?.settings_object as SettingsContentType
const showDialog = ref(false)
const dialogGroup = ref<TradeGroup | null>(null)
const { fetchSymbols } = useSymbols()
const { fetchDayTags } = useDayTags()
const filterLoading = ref(false)
const isInitialLoad = ref(true)
const refreshTrigger = ref(0)

const expandedGroups = ref<{ [key: string]: boolean }>({})
const isExpanded = computed({
    get: () => userStore.dailyHistoryFilters.isExpanded,
    set: (val) => userStore.dailyHistoryFilters.isExpanded = val
})

type TradeGroup = { key: string; count: number; day: Date; trades: TradeExtendedType[]; pnl: number }
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

// Valeurs appliquées par le bouton Filtrer
const selectedMonth = computed({
    get: () => userStore.dailyHistoryFilters.selectedMonth,
    set: (value) => (userStore.dailyHistoryFilters.selectedMonth = value),
})

const calendarValue = ref<any>(null)

const calendarMonth = computed(() => {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    return { year, month }
})

const getDaysStats = () => {
    // Dépendre de refreshTrigger pour forcer le recalcul quand on l'incrémente
    refreshTrigger.value
    
    // Utiliser lastResults (shallowRef) au lieu du store pour de meilleures perfs
    const trades = lastResults.value as TradeExtendedType[]
    
    if (!selectedMonth.value) 
        return {}
    
    const [year, month] = selectedMonth.value.split('-').map(Number)
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

const onExpand = async () => {
    filterLoading.value = true
    setTimeout(() => {
        isExpanded.value = !isExpanded.value
        // Appliquer à tous les groupes
        const groups = filteredGroups.value
        for (let i = 0; i < groups.length; i++) {
            expandedGroups.value[groups[i].key] = isExpanded.value
        }
        filterLoading.value = false
    }, 100)
}

const onFilter = async () => {
    await forceReactivity()
}

// Fonction unique pour charger les données du mois
const loadMonthData = async () => {
    filterLoading.value = true
    expandedGroups.value = {}
    await applyDaysTags()
    await applyCalendar(selectedMonth.value)
    filterLoading.value = false
}

// Debounce pour éviter les appels multiples
const loadMonthDataDebounced = useDebounceFn(loadMonthData, 200)

const onCalendarMonthChange = (...args: unknown[]) => {
    const month = args[0] as { year: number; month: number }
    userStore.dailyHistoryFilters.selectedMonth = `${month.year}-${month.month.toString().padStart(2, '0')}`
    selectedMonth.value = userStore.dailyHistoryFilters.selectedMonth
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
            await fetchData(startDate, endDate, true, userStore.dailyHistoryFilters.accountIds)
        }
    }
}

async function applyDaysTags(forceFetch: boolean = true) {
    if (forceFetch) {
        await fetchDayTags(selectedMonth.value)
    }
}

const forceReactivity = async () => {
    await loadMonthData()
}

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

        // Forcer la réactivité UNIQUEMENT après une reconnexion
        if (userStore.shouldRefreshData() && (userStore.dayTags.length > 0 || userStore.dailyHistoryFilters.last_results.length > 0)) {
            await forceReactivity()
            userStore.clearDataRefresh()
        }

        if (!settings?.autoDataSync) 
            refreshTrigger.value++

        filterLoading.value = false
        isInitialLoad.value = false
    })
})

// Vérifier que les comptes sélectionnés existent toujours
watch([() => userStore.dailyHistoryFilters.accountIds as number[], accounts], ([currentIds, accountsList]) => {
    if (!currentIds?.length) return

    const validIds = currentIds.filter((id) => accountsList.some((account) => account.id === id))

    if (validIds.length !== currentIds.length) {
        userStore.dailyHistoryFilters.accountIds = validIds.length ? validIds : []
    }
})

// Appliquer les filtres quand les comptes changent
watch(
    () => [...(userStore.dailyHistoryFilters.accountIds || [])],
    async () => {
        await forceReactivity()
    },
    { deep: true }
)

// Mettre à jour l'état de loading quand les données sont chargées
watchEffect(() => {
    if (filteredGroups.value) {
        filterLoading.value = false
    }
})

// Appliquer les filtres quand showInactive change
watch(
    () => userStore.dailyHistoryFilters.showInactive,
    async () => {
        await forceReactivity()
    }
)

// Synchronisation bidirectionnelle : quand selectedMonth change, on charge les données
watch(selectedMonth, () => {
    loadMonthDataDebounced()
})

// Synchroniser expandedGroups avec isExpanded quand les groupes changent
watch([filteredGroups, isExpanded], ([groups, expanded]) => {
    if (expanded) {
        groups.forEach(group => {
            expandedGroups.value[group.key] = true
        })
    }
}, { immediate: false })

// Ouvrir le dialog automatiquement au premier chargement
watch(filteredGroups, (groups) => {
    if (isInitialLoad.value && groups.length > 0) {
        nextTick(() => {
            setDialogToFirstTradingDay()
            isInitialLoad.value = false
        })
    }
}, { immediate: true })
</script>
