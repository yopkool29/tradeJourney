<template>
    <div>
        <!-- Filtres simplifiés : compte + mois -->
        <UCard class="card-container-xl">
            <template #default>
                <div class="flex items-start justify-between">
                    <div class="flex flex-col">
                        <CommonTradeFilters
                            v-model:account-ids="dbStateStore.calendarFilters.accountIds"
                            v-model:show-inactive="dbStateStore.calendarFilters.showInactive"
                            v-model:filters="filters"
                            v-model:show-advanced-filters="dbStateStore.calendarFilters.showAdvancedFilters"
                            v-model:last-filter-column="dbStateStore.calendarFilters.lastFilterColumn"
                            :title="$t('components.calendar.index.accounts')"
                            slot-id="page-calendar"
                            :show-plugin-slot="false"
                            :filter-loading="filterLoading"
                            :account-options="accountOptions"
                            :placeholder="$t('components.calendar.index.select_accounts')"
                            :all-label="$t('components.calendar.index.all_accounts')"
                            :selected-label="
                                $t('components.calendar.index.selected_accounts', { count: dbStateStore.calendarFilters.accountIds?.length })
                            "
                            :show-inactive-checkbox="false"
                            :tag-groups="tagGroups"
                            :dirty="filterDirty"
                            @apply="onExplicitApply"
                            @reset="resetFilters"
                            @remove="
                                (isLast) => {
                                    if (isLast) onExplicitApply()
                                }
                            "
                        >
                            <template #after-accounts>
                                <div class="filter-actions-lg">
                                    <UInput
                                        :model-value="selectedMonth"
                                        type="month"
                                        class="date-input"
                                        @change="
                                            (e: Event) => {
                                                selectedMonth = (e.target as HTMLInputElement).value
                                            }
                                        "
                                    />
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
                    </div>
                    <div class="flex flex-col items-start gap-2">
                        <PluginPageSlot slot-id="page-calendar" />
                        <CommonPnLCalendar
                            v-model="calendarValue"
                            :month="calendarMonth"
                            :day-stats="dayStats"
                            :show="settings.showCalendarCalendar"
                            @update:month="onCalendarMonthChange"
                        />
                    </div>
                </div>
            </template>
        </UCard>

        <!-- Grille calendrier mensuelle -->
        <div class="flex flex-col-reverse xl:flex-row xl:gap-8 items-start max-w-6xl">
            <div class="w-full">
                <div v-if="!filteredGroups.length" class="py-8 text-center text-secondary">
                    <div class="text-lg mb-2">{{ $t('components.calendar.index.no_history') }}</div>
                </div>
                <div v-else class="overflow-x-auto w-full">
                    <div class="min-w-[950px]">
                        <!-- En-têtes des jours de la semaine -->
                        <div class="grid grid-cols-8 gap-2 mb-2">
                            <div
                                v-for="day in weekDays"
                                :key="day"
                                class="text-center font-semibold text-sm p-2 bg-gray-100 dark:bg-gray-800 rounded"
                            >
                                {{ day }}
                            </div>
                            <div class="text-center font-semibold text-sm p-2 bg-blue-100 dark:bg-blue-900 rounded">
                                {{ $t('components.calendar.index.week_total') }}
                            </div>
                        </div>

                        <!-- Grille des semaines -->
                        <div v-for="(week, weekIndex) in calendarWeeks" :key="weekIndex" class="grid grid-cols-8 gap-2 mb-2">
                            <!-- Jours de la semaine -->
                            <div
                                v-for="(day, dayIndex) in week.days"
                                :key="dayIndex"
                                class="border rounded px-2 py-0 min-h-[100px] transition-all cursor-pointer hover:shadow-lg hover:scale-105"
                                :class="{
                                    'calendar-day-positive': day.pnl > 0,
                                    'calendar-day-negative': day.pnl < 0,
                                    'calendar-day-neutral': day.pnl === 0 || !day.isCurrentMonth,
                                    'opacity-50': !day.isCurrentMonth,
                                }"
                                @click="openDayModal(day)"
                            >
                                <CalendarDayCard :day="day" />
                            </div>

                            <!-- Total de la semaine -->
                            <div
                                class="border rounded p-2 min-h-[100px] flex flex-col items-center justify-center transition-all cursor-pointer hover:shadow-lg"
                                :class="{
                                    'calendar-day-positive': week.total > 0,
                                    'calendar-day-negative': week.total < 0,
                                    'calendar-day-neutral': week.total === 0,
                                }"
                                @click="openWeekModal(week)"
                            >
                                <div class="text-xs font-semibold mb-1">{{ $t('components.calendar.index.total') }}</div>
                                <div
                                    class="text-lg font-bold"
                                    :class="{
                                        'calendar-pnl-positive': week.total > 0,
                                        'calendar-pnl-negative': week.total < 0,
                                    }"
                                >
                                    {{ formatCurrency(week.total) }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal pour afficher les trades d'une journée -->
        <CommonModalDefault v-model:open="showDayModal" :title="dayModalTitle" :ui="{ content: 'max-w-4/5' }">
            <template #content>
                <DailyTradeGroup
                    v-if="selectedDay && selectedDay.count > 0"
                    v-model:show-table="dayModalShowTable"
                    :show-toggle-button="false"
                    :display-title="false"
                    :group-date="selectedDayDate"
                    :group-trades="selectedDay.trades"
                />
                <div v-else class="py-8 text-center text-gray-500 dark:text-gray-400">
                    <div class="text-lg mb-2">{{ $t('components.calendar.index.no_trades_for_day') }}</div>
                </div>
            </template>
        </CommonModalDefault>

        <!-- Modal pour afficher les trades d'une semaine -->
        <CommonModalDefault v-model:open="showWeekModal" :title="weekModalTitle" :ui="{ content: 'max-w-4/5' }">
            <template #content>
                <template v-for="day in selectedWeekDays" :key="day.dayNumber">
                    <DailyTradeGroup
                        v-if="day.count > 0"
                        v-model:show-table="weekModalShowTable[day.dayNumber]"
                        :show-toggle-button="false"
                        :display-title="false"
                        :group-date="getDateFromDay(day)"
                        :group-trades="day.trades"
                    />
                </template>
                <div v-if="!selectedWeekDays.some((d) => d.count > 0)" class="py-8 text-center text-gray-500 dark:text-gray-400">
                    <div class="text-lg mb-2">{{ $t('components.calendar.index.no_trades_for_week') }}</div>
                </div>
            </template>
        </CommonModalDefault>
    </div>
</template>

<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import type { TradeExtendedType } from '~/schema/trade'
import type { SettingsContentType } from '~/schema/user'
import { getWinrate } from '~/utils/tradeStats'
import { useUserStore } from '~/stores/user'
import { formatDateToYYYYMMDD } from '~/utils/date-utils'
import type { TradeFilter } from '~/type'
import { OPERATOR_EQUAL } from '~/utils'

const { formatCurrency } = useUtils()

const userStore = useUserStore()
const dbStateStore = useDbStateStore()
const { startLoading, stopLoading } = useGlobalLoading()
const { displayModeNet } = useNetGrossDisplay()
const settings = userStore.user?.settings_object as SettingsContentType
const { t } = useI18n()

type DayData = {
    dayNumber: number
    isCurrentMonth: boolean
    count: number
    pnl: number
    commission?: number
    winrate: number
    trades: TradeExtendedType[]
    screenshotCount: number
    hasDetailedNote: boolean
}

type WeekData = {
    days: DayData[]
    total: number
}

const { accounts, calendarLastTrades, fetchAccounts, fetchData, clearLastTrades } = useDailyHistory('calendarFilters')
const { fetchDayTags } = useDayTags()
const { tagGroups, fetchGroups } = useTags()

const accountOptions = computed(() => {
    return accounts.value.map((account) => {
        return {
            value: account.id,
            label: account.displayName,
        }
    })
})

const weekDays = computed(() => {
    return [
        t('common.weekdays.short.monday'),
        t('common.weekdays.short.tuesday'),
        t('common.weekdays.short.wednesday'),
        t('common.weekdays.short.thursday'),
        t('common.weekdays.short.friday'),
        t('common.weekdays.short.saturday'),
        t('common.weekdays.short.sunday'),
    ]
})

const selectedMonth = computed({
    get: () => dbStateStore.calendarFilters.selectedMonth,
    set: (value) => (dbStateStore.calendarFilters.selectedMonth = value),
})

const fetchingDateRange = ref(false)

const setHistoryDateRange = async () => {
    fetchingDateRange.value = true
    try {
        const result = await $fetch<{ minDate: string | null; maxDate: string | null }>('/api/trades/date-range', {
            query: {
                accountIds: JSON.stringify(dbStateStore.calendarFilters.accountIds),
            },
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

const displayMonth = ref(dbStateStore.calendarFilters.selectedMonth)
const dataStore = useDataStore()
const displayResults = shallowRef<TradeExtendedType[]>(calendarLastTrades.value)

const calendarMonth = computed(() => {
    const [year, month] = displayMonth.value.split('-').map(Number)
    return { year, month }
})

const selectedDayDate = computed(() => {
    if (!selectedDay.value || !selectedMonth.value) return new Date()
    const [year, month] = selectedMonth.value.split('-').map(Number)
    return new Date(year, month - 1, selectedDay.value.dayNumber)
})

const dayModalTitle = computed(() => {
    if (!selectedDay.value) return ''
    const date = selectedDayDate.value
    const locale = t('locale') as 'fr' | 'en' | 'us'
    return formatDateLongString(date, locale, true)
})

const selectedWeekDays = computed(() => {
    if (!selectedWeek.value) return []
    return selectedWeek.value.days.filter((day) => day.isCurrentMonth)
})

const weekModalTitle = computed(() => {
    if (!selectedWeekDays.value.length) return ''
    const firstDay = selectedWeekDays.value[0]
    const lastDay = selectedWeekDays.value[selectedWeekDays.value.length - 1]
    const locale = t('locale') as 'fr' | 'en' | 'us'
    const firstDate = getDateFromDay(firstDay)
    const lastDate = getDateFromDay(lastDay)
    return `${formatDateLongString(firstDate, locale, false)} - ${formatDateLongString(lastDate, locale, false)}`
})

const filters = computed({
    get: () => dbStateStore.calendarFilters.filters || [{ column: 'symbol', operator: OPERATOR_EQUAL, value: '' }],
    set: (val) => (dbStateStore.calendarFilters.filters = val),
})

// Fonction pour construire les filtres du calendar (convertit selectedMonth en dates)
const buildCalendarFilters = (): TradeFilter[] => {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = endOfMonth(startDate)

    return buildFiltersForApi(startDate, endDate, true, dbStateStore.calendarFilters.accountIds, filters.value)
}

// Utiliser le pattern générique pour la gestion des filtres
const { filterDirty, debouncedHandleFilterChange, onExplicitApply } = useFilteredPage({
    pageType: 'calendar',
    onFetch: async () => {
        await loadCalendarDataDebounced()
    },
    buildFiltersFn: buildCalendarFilters,
    debounceMs: 300,
})

function resetFilters() {
    filters.value = []
    dbStateStore.calendarFilters.showAdvancedFilters = false
    loadCalendarDataDebounced()
}

const calendarValue = ref<CalendarDate | null>(null)

const { filterLoading, loadDebounced: loadCalendarDataDebounced } = usePageDataManager({
    fetchFn: () => applyCalendar(selectedMonth.value),
    onAfterFetch: () => {
        displayResults.value = calendarLastTrades.value
        displayMonth.value = selectedMonth.value
        const [year, month] = selectedMonth.value.split('-').map(Number)
        calendarValue.value = new CalendarDate(year, month, 1)
    },
    accounts,
    getAccountIds: () => dbStateStore.calendarFilters.accountIds,
    setAccountIds: (ids) => {
        dbStateStore.calendarFilters.accountIds = ids
    },
})

// Modal pour afficher les trades d'une journée
const showDayModal = ref(false)
const selectedDay = ref<DayData | null>(null)
const dayModalShowTable = ref(true)

const openDayModal = async (day: DayData) => {
    if (!day.isCurrentMonth || day.count === 0) return

    startLoading()

    await new Promise<void>((resolve) =>
        setTimeout(() => {
            selectedDay.value = day
            showDayModal.value = true
            resolve()
        }, 100)
    )

    stopLoading()
}

// Modal pour afficher les trades d'une semaine
const showWeekModal = ref(false)
const selectedWeek = ref<WeekData | null>(null)
const weekModalShowTable = ref<Record<number, boolean>>({})

const getDateFromDay = (day: DayData): Date => {
    if (!selectedMonth.value) return new Date()
    const [year, month] = selectedMonth.value.split('-').map(Number)
    return new Date(year, month - 1, day.dayNumber)
}

const openWeekModal = async (week: WeekData) => {
    const hasTradesInWeek = week.days.some((day) => day.isCurrentMonth && day.count > 0)
    if (!hasTradesInWeek) return

    startLoading()

    // Utiliser une Promise pour attendre le setTimeout
    await new Promise<void>((resolve) => {
        setTimeout(() => {
            selectedWeek.value = week
            // Initialiser tous les tableaux comme ouverts
            weekModalShowTable.value = {}
            week.days.forEach((day) => {
                if (day.isCurrentMonth && day.count > 0) {
                    weekModalShowTable.value[day.dayNumber] = true
                }
            })
            showWeekModal.value = true
            resolve()
        }, 100)
    })

    stopLoading()
}

const getDaysStats = () => {
    const trades = displayResults.value as TradeExtendedType[]
    if (!displayMonth.value) return {}
    const [year, month] = displayMonth.value.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = endOfMonth(start)

    // Extraire accountIds en Set pour O(1) lookup
    const accountIds = dbStateStore.calendarFilters.accountIds
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

    const stats: { [key: string]: { count: number; pnl: number; commission: number; trades: TradeExtendedType[] } } = {}

    eachDayOfInterval({ start, end }).forEach((day) => {
        const key = formatDateToYYYYMMDD(day)
        const tradesOfDay = tradesByDay[key] || []
        const pnl = tradesOfDay.reduce((sum, t) => sum + (displayModeNet.value ? t.netProfit || 0 : t.profit || 0), 0)
        const commission = tradesOfDay.reduce((sum, t) => sum + (t.commission || 0), 0)
        stats[key] = {
            count: tradesOfDay.length,
            pnl,
            commission,
            trades: tradesOfDay,
        }
    })
    return stats
}

const dayStats = computed(() => {
    return getDaysStats()
})

const filteredGroups = computed(() => {
    return Object.values(dayStats.value).filter((g) => g.count > 0)
})

const calendarWeeks = computed(() => {
    if (!displayMonth.value) return []

    const [year, month] = displayMonth.value.split('-').map(Number)
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = endOfMonth(monthStart)

    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    const weeks: WeekData[] = []
    let currentWeek: DayData[] = []
    let weekTotal = 0

    allDays.forEach((day) => {
        const dayKey = formatDateToYYYYMMDD(day)
        const dayData = dayStats.value[dayKey]
        const isCurrentMonth = day.getMonth() === month - 1

        // Calculate screenshot count and detailed note presence for the day
        const trades = dayData?.trades || []
        const screenshotCount = trades.reduce((total, trade) => {
            const screenshots = trade.screenshots?.length || 0
            const hasScreenshotUrl = trade.screenshotUrl ? 1 : 0
            return total + screenshots + hasScreenshotUrl
        }, 0)
        const hasDetailedNote = trades.some((trade) => {
            const detailedNote = (trade.metadata as Record<string, unknown>)?.detailedNote as string
            return detailedNote && detailedNote.length > 0
        })

        const dayInfo: DayData = {
            dayNumber: day.getDate(),
            isCurrentMonth,
            count: dayData?.count || 0,
            pnl: dayData?.pnl || 0,
            commission: dayData?.commission || 0,
            winrate: dayData?.trades ? getWinrate(dayData.trades, 0) : 0,
            trades: trades,
            screenshotCount,
            hasDetailedNote,
        }

        currentWeek.push(dayInfo)
        if (isCurrentMonth) {
            weekTotal += dayInfo.pnl
        }

        if (currentWeek.length === 7) {
            weeks.push({
                days: currentWeek,
                total: weekTotal,
            })
            currentWeek = []
            weekTotal = 0
        }
    })

    if (currentWeek.length > 0) {
        weeks.push({
            days: currentWeek,
            total: weekTotal,
        })
    }

    return weeks
})

const onCalendarMonthChange = (...args: unknown[]) => {
    const month = args[0] as { year: number; month: number }
    selectedMonth.value = `${month.year}-${month.month.toString().padStart(2, '0')}`
}

async function applyCalendar(val: string, forceFetch: boolean = true) {
    if (val) {
        const startDate = startOfMonth(selectedMonth.value)
        const endDate = endOfMonth(startDate)
        if (forceFetch) {
            await Promise.all([
                fetchData(startDate, endDate, true, dbStateStore.calendarFilters.accountIds, filters.value),
                fetchDayTags(selectedMonth.value),
            ])
        }
    }
}

onMounted(async () => {
    // Clear data if autoDataSync is enabled
    if (settings?.autoDataSync) {
        clearLastTrades()
    }

    nextTick(async () => {
        if (settings?.autoDataSync) filterLoading.value = true

        await Promise.all([fetchAccounts(), fetchDayTags(selectedMonth.value), fetchGroups()])

        // Initialiser calendarValue avec le mois sélectionné
        const [year, month] = selectedMonth.value.split('-').map(Number)
        calendarValue.value = new CalendarDate(year, month, 1)

        const needForceCalendar = calendarLastTrades.value.length === 0

        // Charger les données du calendrier si nécessaire
        await applyCalendar(selectedMonth.value, needForceCalendar)

        displayResults.value = calendarLastTrades.value

        displayMonth.value = selectedMonth.value

        if (userStore.shouldRefreshData() && calendarLastTrades.value.length > 0) {
            await applyCalendar(selectedMonth.value)
            displayResults.value = calendarLastTrades.value
            userStore.clearDataRefresh()
        }

        filterLoading.value = false
    })
})

// Watcher pour les comptes (debounced)
watch(
    () => [...(dbStateStore.calendarFilters.accountIds || [])],
    () => debouncedHandleFilterChange(),
    { deep: true }
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
        loadCalendarDataDebounced()
    }
})

// Rafraîchir les données quand les modales se ferment
watch([showDayModal, showWeekModal], ([newDay, newWeek], [oldDay, oldWeek]) => {
    const dayModalClosed = oldDay === true && newDay === false
    const weekModalClosed = oldWeek === true && newWeek === false

    if (dayModalClosed || weekModalClosed) {
        loadCalendarDataDebounced()
    }
})
</script>
