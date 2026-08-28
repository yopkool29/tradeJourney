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
                                class="text-center font-semibold text-sm p-2 bg-elevated rounded"
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
                <div v-else class="py-8 text-center text-muted">
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
                <div v-if="!selectedWeekDays.some((d) => d.count > 0)" class="py-8 text-center text-muted">
                    <div class="text-lg mb-2">{{ $t('components.calendar.index.no_trades_for_week') }}</div>
                </div>
            </template>
        </CommonModalDefault>
    </div>
</template>

<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { startOfMonth, endOfMonth } from 'date-fns'
import type { TradeExtendedType } from '~/schema/trade'
import type { SettingsContentType } from '~/schema/user'
import { useUserStore } from '~/stores/user'
import type { TradeFilter } from '~/type'
import { OPERATOR_EQUAL } from '~/utils'
import { useCalendarGrid } from '~/composables/ui/useCalendarGrid'

const { formatCurrency } = useUtils()

const userStore = useUserStore()
const dbStateStore = useDbStateStore()
const { displayModeNet } = useNetGrossDisplay()
const settings = userStore.user?.settings_object as SettingsContentType
const { t } = useI18n()

const { accounts, calendarLastTrades, fetchAccounts, fetchData, clearLastTrades } = useDailyHistory('calendarFilters')
const { fetchDayTags } = useDayTags()
const { tagGroups, fetchGroups } = useTags()

const accountOptions = computed(() => accounts.value.map((account) => ({ value: account.id, label: account.displayName })))

const weekDays = computed(() => [
    t('common.weekdays.short.monday'),
    t('common.weekdays.short.tuesday'),
    t('common.weekdays.short.wednesday'),
    t('common.weekdays.short.thursday'),
    t('common.weekdays.short.friday'),
    t('common.weekdays.short.saturday'),
    t('common.weekdays.short.sunday'),
])

const selectedMonth = computed({
    get: () => dbStateStore.calendarFilters.selectedMonth,
    set: (value) => (dbStateStore.calendarFilters.selectedMonth = value),
})

const fetchingDateRange = ref(false)

const setHistoryDateRange = async () => {
    fetchingDateRange.value = true
    try {
        const result = await $fetch<{ minDate: string | null; maxDate: string | null }>('/api/trades/date-range', {
            query: { accountIds: JSON.stringify(dbStateStore.calendarFilters.accountIds) },
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
const displayResults = shallowRef<TradeExtendedType[]>(calendarLastTrades.value)

const calendarMonth = computed(() => {
    const [year, month] = displayMonth.value.split('-').map(Number)
    return { year, month }
})

const {
    dayStats, filteredGroups, calendarWeeks,
    showDayModal, selectedDay, dayModalShowTable,
    showWeekModal, weekModalShowTable,
    selectedDayDate, dayModalTitle, selectedWeekDays, weekModalTitle,
    openDayModal, openWeekModal, getDateFromDay,
} = useCalendarGrid(
    displayMonth,
    displayResults,
    displayModeNet,
    computed(() => dbStateStore.calendarFilters.accountIds || []),
    selectedMonth,
    () => t('locale'),
)

const filters = computed({
    get: () => dbStateStore.calendarFilters.filters || [{ column: 'symbol', operator: OPERATOR_EQUAL, value: '' }],
    set: (val) => (dbStateStore.calendarFilters.filters = val),
})

const buildCalendarFilters = (): TradeFilter[] => {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = endOfMonth(startDate)
    return buildFiltersForApi(startDate, endDate, true, dbStateStore.calendarFilters.accountIds, filters.value)
}

const { filterDirty, debouncedHandleFilterChange, onExplicitApply } = useFilteredPage({
    pageType: 'calendar',
    onFetch: async () => { await loadCalendarDataDebounced() },
    buildFiltersFn: buildCalendarFilters,
    debounceMs: 300,
})

function resetFilters() {
    filters.value = []
    dbStateStore.calendarFilters.showAdvancedFilters = false
    loadCalendarDataDebounced()
}

const [initYear, initMonth] = dbStateStore.calendarFilters.selectedMonth.split('-').map(Number)
const calendarValue = ref<CalendarDate | null>(new CalendarDate(initYear, initMonth, 1))

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
    setAccountIds: (ids) => { dbStateStore.calendarFilters.accountIds = ids },
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
    if (settings?.autoDataSync) clearLastTrades()
    nextTick(async () => {
        if (settings?.autoDataSync) filterLoading.value = true
        await Promise.all([fetchAccounts(), fetchDayTags(selectedMonth.value), fetchGroups()])
        const [year, month] = selectedMonth.value.split('-').map(Number)
        calendarValue.value = new CalendarDate(year, month, 1)
        const needForceCalendar = calendarLastTrades.value.length === 0
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

watch(() => [...(dbStateStore.calendarFilters.accountIds || [])], () => debouncedHandleFilterChange(), { deep: true })
watch(selectedMonth, () => debouncedHandleFilterChange())
watch(
    () => filters.value,
    (newFilters, oldFilters) => {
        if (filterLoading.value) return
        if (newFilters && oldFilters && newFilters.length > oldFilters.length) {
            const addedFilter = newFilters[newFilters.length - 1]
            if (!addedFilter.value || addedFilter.value === '') return
        }
        debouncedHandleFilterChange()
    },
    { deep: true }
)

const { currentDatabase } = useDatabase()
watch(currentDatabase, (newDb, oldDb) => {
    if (newDb && oldDb && newDb.id !== oldDb.id) loadCalendarDataDebounced()
})

watch([showDayModal, showWeekModal], ([newDay, newWeek], [oldDay, oldWeek]) => {
    const dayModalClosed = oldDay === true && newDay === false
    const weekModalClosed = oldWeek === true && newWeek === false
    if (dayModalClosed || weekModalClosed) loadCalendarDataDebounced()
})
</script>
