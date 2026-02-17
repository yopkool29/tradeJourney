<template>
    <div>
        <!-- Filtres simplifiés : compte + mois -->
        <UCard class="card-container">
            <div class="filter-container">
                <div class="section-label">{{ $t('components.calendar.index.accounts') }}</div>
                <USelect v-model="userStore.calendarFilters.accountIds" :items="accountOptions"
                    :placeholder="$t('components.calendar.index.select_accounts')" multiple class="select-standard">
                    <div>
                        <span v-if="!userStore.calendarFilters.accountIds?.length">{{
                            $t('components.calendar.index.all_accounts') }}</span>
                        <span v-else>{{
                            $t('components.calendar.index.selected_accounts', {
                                count:
                                    userStore.calendarFilters.accountIds?.length
                            })
                        }}</span>
                    </div>
                </USelect>
            </div>
            <div class="filter-actions-lg mb-2">
                <UInput v-model="userStore.calendarFilters.selectedMonth" type="month" class="date-input" />
                <UButton :loading="filterLoading" icon="i-lucide-filter" color="primary" size="sm" @click="onFilter">{{
                    $t('components.calendar.index.filter')
                }}</UButton>
            </div>
        </UCard>

        <!-- Grille calendrier mensuelle -->
        <div class="flex flex-col-reverse xl:flex-row xl:gap-8 items-start">
            <div :class="{
                'w-full': !settings.showCalendarCalendar,
                'w-full xl:w-2/3 2xl:w-[calc(100%-300px)]': settings.showCalendarCalendar
            }">
                <div v-if="!filteredGroups.length" class="py-8 text-center text-secondary">
                    <div class="text-lg mb-2">{{ $t('components.calendar.index.no_history') }}</div>
                </div>
                <div v-else class="overflow-x-auto">
                    <div class="min-w-[800px]">
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
                                class="border rounded p-2 min-h-[100px] transition-all cursor-pointer hover:shadow-lg hover:scale-105"
                                :class="{
                                    'calendar-day-positive': day.pnl > 0,
                                    'calendar-day-negative': day.pnl < 0,
                                    'calendar-day-neutral': day.pnl === 0 || !day.isCurrentMonth,
                                    'opacity-50': !day.isCurrentMonth,
                                }" @click="openDayModal(day)">
                                <div class="flex flex-col h-full">
                                    <div class="font-bold text-lg mb-1 text-gray-600 dark:text-gray-300"
                                        :class="{ 'text-gray-400': !day.isCurrentMonth }">
                                        {{ day.dayNumber }}
                                    </div>
                                    <div v-if="day.isCurrentMonth && day.count > 0" class="flex flex-col gap-1 text-xs">
                                        <div class="form-row">
                                            <span class="stat-label">{{ $t('components.calendar.index.trades')
                                            }}:</span>
                                            <span class="stat-value">{{ day.count }}</span>
                                        </div>
                                        <div class="form-row">
                                            <span class="stat-label">{{ $t('components.calendar.index.winrate')
                                            }}:</span>
                                            <span class="stat-value">{{ day.winrate }}%</span>
                                        </div>
                                        <div class="form-row">
                                            <span class="stat-label">{{ $t('components.calendar.index.pnl')
                                            }}:</span>
                                            <span class="font-bold" :class="{
                                                'calendar-pnl-positive': day.pnl > 0,
                                                'calendar-pnl-negative': day.pnl < 0,
                                            }">
                                                {{ formatCurrency(day.pnl) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Total de la semaine -->
                            <div class="border rounded p-2 min-h-[100px] flex flex-col items-center justify-center transition-all cursor-pointer hover:shadow-lg"
                                :class="{
                                    'calendar-cell-positive': week.total > 0,
                                    'calendar-cell-negative': week.total < 0,
                                    'calendar-cell-neutral': week.total === 0,
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

            <!-- Colonne droite : Calendrier de navigation -->
            <div v-if="settings.showCalendarCalendar"
                class="px-2 border-2 border-gray-300 mb-8 xl:mb-0 xl:sticky xl:top-4 xl:self-start min-w-[250px]">
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

        <!-- Modal pour afficher les trades d'une journée -->
        <CommonModalDefault v-model:open="showDayModal" :title="dayModalTitle" :ui="{ content: 'max-w-4/5' }">
            <template #content>
                <DailyTradeGroup v-if="selectedDay && selectedDay.count > 0" v-model:show-table="dayModalShowTable"
                    :group-date="selectedDayDate" :group-trades="selectedDay.trades" />
                <div v-else class="py-8 text-center text-gray-500 dark:text-gray-400">
                    <div class="text-lg mb-2">{{ $t('components.calendar.index.no_trades_for_day') }}</div>
                </div>
            </template>
        </CommonModalDefault>

        <!-- Modal pour afficher les trades d'une semaine -->
        <CommonModalDefault v-model:open="showWeekModal" :title="weekModalTitle" :ui="{ content: 'max-w-4/5' }">
            <template #content>
                <template v-for="day in selectedWeekDays" :key="day.dayNumber">
                    <DailyTradeGroup v-if="day.count > 0" v-model:show-table="weekModalShowTable[day.dayNumber]"
                        :group-date="getDateFromDay(day)" :group-trades="day.trades" />
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
import { format, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import type { TradeExtendedType } from '~/schema/trade'
import type { AccountType } from '~/schema/account'
import type { SettingsContentType } from '~/schema/user'
import { getWinrate } from '~/utils/tradeStats'
import { useUserStore } from '~/stores/user'
import { formatDateToYYYYMMDD } from '~/utils/date-utils'

const { formatCurrency } = useUtils()

const userStore = useUserStore()
const { startLoading, stopLoading } = useGlobalLoading()
const settings = userStore.user?.settings_object as SettingsContentType
const filterLoading = ref(false)
const { t } = useI18n()

type DayData = {
    dayNumber: number
    isCurrentMonth: boolean
    count: number
    pnl: number
    winrate: number
    trades: TradeExtendedType[]
}

type WeekData = {
    days: DayData[]
    total: number
}

const { accounts, fetchAccounts, fetchData } = useDailyHistory('calendarFilters')

const accountOptions = computed(() => {
    return accounts.value.map((account) => {
        return {
            value: account.id,
            label: account.displayName,
        }
    })
})

const selectedMonth = computed({
    get: () => userStore.calendarFilters.selectedMonth,
    set: (value) => (userStore.calendarFilters.selectedMonth = value),
})

const calendarValue = ref<CalendarDate | null>(null)

// Modal pour afficher les trades d'une journée
const showDayModal = ref(false)
const selectedDay = ref<DayData | null>(null)
const dayModalShowTable = ref(true)

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

const calendarMonth = computed(() => {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    return { year, month }
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

const getDaysStats = () => {
    const trades: TradeExtendedType[] = userStore.calendarFilters.last_results
    if (!selectedMonth.value) return {}
    const [year, month] = selectedMonth.value.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = endOfMonth(start)

    const filtered = trades.filter((trade) => {
        const closeDate = trade.closeDate
        const matchAccount =
            userStore.calendarFilters.accountIds.length === 0 ||
            userStore.calendarFilters.accountIds.includes(-1) ||
            userStore.calendarFilters.accountIds.includes(trade.accountId)
        return closeDate >= start && closeDate <= end && matchAccount
    })

    const stats: { [key: string]: { count: number; pnl: number; trades: TradeExtendedType[] } } = {}
    eachDayOfInterval({ start, end }).forEach((day) => {
        const key = formatDateToYYYYMMDD(day)
        const tradesOfDay = filtered.filter((trade) => formatDateToYYYYMMDD(trade.closeDate) === key)
        const pnl = tradesOfDay.reduce((sum, t) => sum + (t.profit || 0), 0)
        stats[key] = {
            count: tradesOfDay.length,
            pnl,
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
    if (!selectedMonth.value) return []

    const [year, month] = selectedMonth.value.split('-').map(Number)
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

async function onFilter() {
    filterLoading.value = true
    await forceReactivity()
}

function onCalendarMonthChange(...args: unknown[]) {
    const month = args[0] as { year: number; month: number }
    userStore.calendarFilters.selectedMonth = `${month.year}-${month.month.toString().padStart(2, '0')}`
    selectedMonth.value = userStore.calendarFilters.selectedMonth
}

async function applyCalendar(val: string, forceFetch: boolean = true) {
    if (val) {
        const startDate = startOfMonth(selectedMonth.value)
        const endDate = endOfMonth(startDate)
        if (forceFetch) {
            await fetchData(startDate, endDate, true, userStore.calendarFilters.accountIds)
        }
    }
}

async function forceReactivity() {
    await applyCalendar(selectedMonth.value)
}

onMounted(async () => {
    // Clear data if autoDataSync is enabled
    if (settings?.autoDataSync) {
        userStore.calendarFilters.last_results = []
    }

    await fetchAccounts()

    // Initialiser calendarValue avec le mois sélectionné
    const [year, month] = selectedMonth.value.split('-').map(Number)
    calendarValue.value = new CalendarDate(year, month, 1)

    const needForceCalendar = userStore.calendarFilters.last_results.length === 0
    await applyCalendar(selectedMonth.value, needForceCalendar)

    if (userStore.shouldRefreshData() && userStore.calendarFilters.last_results.length > 0) {
        await forceReactivity()
        userStore.clearDataRefresh()
    }
})

watch([() => userStore.calendarFilters.accountIds, accounts], ([currentIds, accountsList]) => {
    if (!currentIds?.length) return

    const validIds = currentIds.filter((id) => accountsList.some((account) => account.id === id))

    if (validIds.length !== currentIds.length) {
        userStore.calendarFilters.accountIds = validIds.length ? validIds : []
    }
})

watch(
    () => [...(userStore.calendarFilters.accountIds || [])],
    () => {
        forceReactivity()
    },
    { deep: true }
)

// Synchroniser calendarValue quand selectedMonth change via le dropdown
watch(selectedMonth, (newMonth) => {
    const [year, month] = newMonth.split('-').map(Number)
    calendarValue.value = new CalendarDate(year, month, 1)
})

// Rafraîchir les données quand les modales se ferment
watch([showDayModal, showWeekModal], ([newDay, newWeek], [oldDay, oldWeek]) => {
    const dayModalClosed = oldDay === true && newDay === false
    const weekModalClosed = oldWeek === true && newWeek === false
    
    if (dayModalClosed || weekModalClosed) {
        forceReactivity()
    }
})

watchEffect(() => {
    if (filteredGroups.value) {
        filterLoading.value = false
    }
})

watch(selectedMonth, async () => {
    filterLoading.value = true
    forceReactivity()
})
</script>
