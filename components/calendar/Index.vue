<template>
    <div>
        <!-- Filtres simplifiés : compte + mois -->
        <UCard class="card-container-xl">
            <template #default>
                <div class="flex items-start justify-between">
                <div class="flex flex-col">
                    <CommonTradeFilters
                        :title="$t('components.calendar.index.accounts')"
                        slot-id="page-calendar"
                        :show-plugin-slot="false"
                        v-model:account-ids="userStore.calendarFilters.accountIds"
                        v-model:show-inactive="userStore.calendarFilters.showInactive"
                        v-model:filters="filters"
                        v-model:show-advanced-filters="userStore.calendarFilters.showAdvancedFilters"
                        :filter-loading="filterLoading"
                        :account-options="accountOptions"
                        :placeholder="$t('components.calendar.index.select_accounts')"
                        :all-label="$t('components.calendar.index.all_accounts')"
                        :selected-label="$t('components.calendar.index.selected_accounts', { count: userStore.calendarFilters.accountIds?.length })"
                        :filterable-columns-config="filterableColumnsConfig"
                        :show-inactive-checkbox="false"
                        :tag-groups="tagGroups"
                        v-model:last-filter-column="userStore.calendarFilters.lastFilterColumn"
                        @apply="onApplyFilters"
                        @reset="resetFilters"
                    >
                        <template #field-type="{ filter, onValueChange }">
                            <USelect :model-value="filter.value as string" :items="[
                                { label: 'Buy', value: 'buy' },
                                { label: 'Sell', value: 'sell' },
                            ]" placeholder="Buy/Sell" class="min-w-[200px]" @update:model-value="onValueChange" />
                        </template>
                        <template #after-accounts>
                            <div class="">
                                <UInput :model-value="selectedMonth" type="month" class="date-input" @change="(e: Event) => { selectedMonth = (e.target as HTMLInputElement).value }" />
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
                            <div v-for="day in weekDays" :key="day"
                                class="text-center font-semibold text-sm p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                {{ day }}
                            </div>
                            <div class="text-center font-semibold text-sm p-2 bg-blue-100 dark:bg-blue-900 rounded">
                                {{ $t('components.calendar.index.week_total') }}
                            </div>
                        </div>

                        <!-- Grille des semaines -->
                        <div v-for="(week, weekIndex) in calendarWeeks" :key="weekIndex"
                            class="grid grid-cols-8 gap-2 mb-2">
                            <!-- Jours de la semaine -->
                            <div v-for="(day, dayIndex) in week.days" :key="dayIndex"
                                class="border rounded px-2 py-0 min-h-[100px] transition-all cursor-pointer hover:shadow-lg hover:scale-105"
                                :class="{
                                    'calendar-day-positive': day.pnl > 0,
                                    'calendar-day-negative': day.pnl < 0,
                                    'calendar-day-neutral': day.pnl === 0 || !day.isCurrentMonth,
                                    'opacity-50': !day.isCurrentMonth,
                                }" @click="openDayModal(day)">
                                <CalendarDayCard :day="day" />
                            </div>

                            <!-- Total de la semaine -->
                            <div class="border rounded p-2 min-h-[100px] flex flex-col items-center justify-center transition-all cursor-pointer hover:shadow-lg"
                                :class="{
                                    'calendar-day-positive': week.total > 0,
                                    'calendar-day-negative': week.total < 0,
                                    'calendar-day-neutral': week.total === 0,
                                }" @click="openWeekModal(week)">
                                <div class="text-xs font-semibold mb-1">{{ $t('components.calendar.index.total') }}
                                </div>
                                <div class="text-lg font-bold" :class="{
                                    'calendar-pnl-positive': week.total > 0,
                                    'calendar-pnl-negative': week.total < 0,
                                }">
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
                <DailyTradeGroup v-if="selectedDay && selectedDay.count > 0" :showToggleButton="false"  :display-title="false"
                    v-model:show-table="dayModalShowTable" :group-date="selectedDayDate"
                    :group-trades="selectedDay.trades" />
                <div v-else class="py-8 text-center text-gray-500 dark:text-gray-400">
                    <div class="text-lg mb-2">{{ $t('components.calendar.index.no_trades_for_day') }}</div>
                </div>
            </template>
        </CommonModalDefault>

        <!-- Modal pour afficher les trades d'une semaine -->
        <CommonModalDefault v-model:open="showWeekModal" :title="weekModalTitle" :ui="{ content: 'max-w-4/5' }">
            <template #content>
                <template v-for="day in selectedWeekDays" :key="day.dayNumber">
                    <DailyTradeGroup v-if="day.count > 0" :showToggleButton="false" :display-title="false"
                        v-model:show-table="weekModalShowTable[day.dayNumber]" :group-date="getDateFromDay(day)"
                        :group-trades="day.trades" />
                </template>
                <div v-if="!selectedWeekDays.some(d => d.count > 0)"
                    class="py-8 text-center text-gray-500 dark:text-gray-400">
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
import type { TradeFilter, FilterColumn } from '~/type'
import {
    OPERATOR_EQUAL,
    OPERATOR_NOT_EQUAL,
    OPERATOR_GREATER_THAN_OR_EQUAL,
} from '~/utils'

const { formatCurrency } = useUtils()

const userStore = useUserStore()
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
}

type WeekData = {
    days: DayData[]
    total: number
}

const { accounts, lastResults, fetchAccounts, fetchData } = useDailyHistory('calendarFilters')
const { fetchDayTags } = useDayTags()
const { tagGroups } = useTags()

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
    get: () => userStore.calendarFilters.selectedMonth,
    set: (value) => (userStore.calendarFilters.selectedMonth = value),
})

const displayMonth = ref(userStore.calendarFilters.selectedMonth)
const displayResults = shallowRef<TradeExtendedType[]>(userStore.calendarFilters.last_results as TradeExtendedType[])

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
    return selectedWeek.value.days.filter(day => day.isCurrentMonth)
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
        operators: [OPERATOR_EQUAL, OPERATOR_NOT_EQUAL],
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
        operators: [OPERATOR_EQUAL],
        defaultOperator: OPERATOR_EQUAL
    },
])

const filters = computed({
    get: () => userStore.calendarFilters.filters || [{ column: 'symbol', operator: OPERATOR_EQUAL, value: '' }],
    set: (val) => userStore.calendarFilters.filters = val
})


function resetFilters() {
    filters.value = []
    userStore.calendarFilters.showAdvancedFilters = false
    loadCalendarDataDebounced()
}

function onApplyFilters() {
    loadCalendarDataDebounced()
}

const calendarValue = ref<CalendarDate | null>(null)

const { filterLoading, loadDebounced: loadCalendarDataDebounced } = usePageDataManager({
    fetchFn: () => applyCalendar(selectedMonth.value),
    onAfterFetch: () => {
        displayResults.value = lastResults.value
        displayMonth.value = selectedMonth.value
        const [year, month] = selectedMonth.value.split('-').map(Number)
        calendarValue.value = new CalendarDate(year, month, 1)
    },
    accounts,
    getAccountIds: () => userStore.calendarFilters.accountIds,
    setAccountIds: (ids) => { userStore.calendarFilters.accountIds = ids },
})

// Modal pour afficher les trades d'une journée
const showDayModal = ref(false)
const selectedDay = ref<DayData | null>(null)
const dayModalShowTable = ref(true)

const openDayModal = async (day: DayData) => {
    if (!day.isCurrentMonth || day.count === 0) return

    startLoading()

    await new Promise<void>((resolve) => setTimeout(() => {
        selectedDay.value = day
        showDayModal.value = true
        resolve()
    }, 100))

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
    const hasTradesInWeek = week.days.some(day => day.isCurrentMonth && day.count > 0)
    if (!hasTradesInWeek) return

    startLoading()

    // Utiliser une Promise pour attendre le setTimeout
    await new Promise<void>((resolve) => {
        setTimeout(() => {
            selectedWeek.value = week
            // Initialiser tous les tableaux comme ouverts
            weekModalShowTable.value = {}
            week.days.forEach(day => {
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
    const accountIds = userStore.calendarFilters.accountIds
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
        const pnl = tradesOfDay.reduce((sum, t) => sum + (displayModeNet.value ? (t.netProfit || 0) : (t.profit || 0)), 0)
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

    allDays.forEach((day, index) => {
        const dayKey = formatDateToYYYYMMDD(day)
        const dayData = dayStats.value[dayKey]
        const isCurrentMonth = day.getMonth() === month - 1

        const dayInfo: DayData = {
            dayNumber: day.getDate(),
            isCurrentMonth,
            count: dayData?.count || 0,
            pnl: dayData?.pnl || 0,
            commission: dayData?.commission || 0,
            winrate: dayData?.trades ? getWinrate(dayData.trades, 0) : 0,
            trades: dayData?.trades || [],
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
                fetchData(startDate, endDate, true, userStore.calendarFilters.accountIds, filters.value),
                fetchDayTags(selectedMonth.value)
            ])
        }
    }
}

onMounted(async () => {
    // Clear data if autoDataSync is enabled
    if (settings?.autoDataSync) {
        userStore.calendarFilters.last_results = []
    }
    nextTick(async () => {
        if (settings?.autoDataSync)
            filterLoading.value = true

        await Promise.all([
            fetchAccounts(),
            fetchDayTags(selectedMonth.value)
        ])

        // Initialiser calendarValue avec le mois sélectionné
        const [year, month] = selectedMonth.value.split('-').map(Number)
        calendarValue.value = new CalendarDate(year, month, 1)

        const needForceCalendar = userStore.calendarFilters.last_results.length === 0

        // Charger les données du calendrier si nécessaire
        await applyCalendar(selectedMonth.value, needForceCalendar)

        displayResults.value = lastResults.value

        displayMonth.value = selectedMonth.value

        if (userStore.shouldRefreshData() && userStore.calendarFilters.last_results.length > 0) {
            await applyCalendar(selectedMonth.value)
            displayResults.value = lastResults.value
            userStore.clearDataRefresh()
        }

        filterLoading.value = false

    })
})

watch(
    () => [...(userStore.calendarFilters.accountIds || [])],
    () => {
        loadCalendarDataDebounced()
    },
    { deep: true }
)

// Charger les données quand selectedMonth change
watch(selectedMonth, () => {
    loadCalendarDataDebounced()
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
