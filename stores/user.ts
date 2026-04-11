import { defineStore } from 'pinia'
import type { UserType } from '~/schema/user'
import type { SymbolType } from '~/schema/symbol'
import type { TradeExtendedType } from '~/schema/trade'
import type { DayTagType } from '~/schema/dayTag'
import type {
    CustomInputs,
    TradeOptions,
    DashBoardFilters,
    DailyHistoryFilters,
    CalendarFilters,
    DashBoardResult,
} from '~/type'
import { formatDateToYYYYMM } from '~/utils/date-utils'

export const useUserStore = defineStore(
    'userStore',
    () => {
        // Get current database context
        const { currentDatabase } = useDatabase()
        const getCurrentDbName = () => currentDatabase.value?.name || 'default'

        // --- Global state (not DB-specific) ---
        const noteAssocMode = ref<'copy' | 'move'>('copy')

        const isLogOpen = ref(false)
        const logOpenFirstInit = ref(true)
        const logMessage = ref('')
        const logDebug1 = ref(0)
        const logDebug2 = ref(0)
        const logFix = ref(0)

        const isLoading = ref(false)
        const quickNavHistory = ref<{ path: string; lastVisit: number }[]>([])
        const lastViewedNoteIdPerDb = ref<Record<string, number | null>>({})
        const conversionType = ref<{ label: string; value: 'schwab-options' | 'tradingview' }>({ label: 'Schwab Options', value: 'schwab-options' })
        const displayModeNet = ref<boolean>(true)
        const auth = useAuth()

        // --- Auth user state (global) ---
        const user = ref<UserType | null>(null)
        const needsDataRefresh = ref<boolean>(false)

        // --- DB-specific state (internal storage per database) ---
        const customInputsPerDb = ref<Record<string, CustomInputs>>({})
        const dayTagsPerDb = ref<Record<string, DayTagType[]>>({})
        const recentColorsPerDb = ref<Record<string, string[]>>({})
        const recentColors2PerDb = ref<Record<string, string[]>>({})
        const tradeOptionsPerDb = ref<Record<string, TradeOptions>>({})
        const dashBoardFiltersPerDb = ref<Record<string, DashBoardFilters>>({})
        const dailyHistoryFiltersPerDb = ref<Record<string, DailyHistoryFilters>>({})
        const calendarFiltersPerDb = ref<Record<string, CalendarFilters>>({})
        const dashBoardResultPerDb = ref<Record<string, DashBoardResult>>({})
        const columnVisibilityPerDb = ref<Record<string, Record<string, boolean>>>({})
        const showDetailedNotePerDb = ref<Record<string, boolean>>({})

        const lastViewedNoteId = computed({
            get: () => {
                const dbName = getCurrentDbName()
                return lastViewedNoteIdPerDb.value[dbName] ?? null
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                lastViewedNoteIdPerDb.value[dbName] = val
            }
        })

        // --- Computed wrappers for DB-specific data ---
        const customInputs = computed({
            get: () => {
                const dbName = getCurrentDbName()
                if (!customInputsPerDb.value[dbName]) {
                    customInputsPerDb.value[dbName] = {}
                }
                return customInputsPerDb.value[dbName]
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                customInputsPerDb.value[dbName] = val
            }
        })

        const getCustomInput = (name: string) =>
            customInputs.value[name] || { items: [], value: '' }

        const updateCustomInput = (name: string, items: string[], value: string) =>
            customInputs.value[name] = { items, value }

        const addCustomItem = (name: string, item: string) => {
            const current = getCustomInput(name)
            const filtered = current.items.filter((i) => i !== item)
            const newItems = [item, ...filtered].slice(0, 20)
            updateCustomInput(name, newItems, item)
        }

        const removeCustomItem = (name: string, item: string) => {
            const current = getCustomInput(name)
            const newItems = current.items.filter(i => i !== item)
            updateCustomInput(name, newItems, current.value)
        }

        const dayTags = computed({
            get: () => {
                const dbName = getCurrentDbName()
                if (!dayTagsPerDb.value[dbName]) {
                    dayTagsPerDb.value[dbName] = []
                }
                return dayTagsPerDb.value[dbName]
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                dayTagsPerDb.value[dbName] = val
            }
        })

        const recentColors = computed({
            get: () => {
                const dbName = getCurrentDbName()
                if (!recentColorsPerDb.value[dbName]) {
                    recentColorsPerDb.value[dbName] = []
                }
                return recentColorsPerDb.value[dbName]
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                recentColorsPerDb.value[dbName] = val
            }
        })

        const recentColors2 = computed({
            get: () => {
                const dbName = getCurrentDbName()
                if (!recentColors2PerDb.value[dbName]) {
                    recentColors2PerDb.value[dbName] = []
                }
                return recentColors2PerDb.value[dbName]
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                recentColors2PerDb.value[dbName] = val
            }
        })

        const tradeOptions = computed({
            get: () => {
                const dbName = getCurrentDbName()
                if (!tradeOptionsPerDb.value[dbName]) {
                    tradeOptionsPerDb.value[dbName] = {
                        accountIds: [] as number[],
                        nbLines: 10,
                        showInactive: false
                    }
                }
                return tradeOptionsPerDb.value[dbName]
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                tradeOptionsPerDb.value[dbName] = val
            }
        })

        const dashBoardFilters = computed({
            get: () => {
                const dbName = getCurrentDbName()
                if (!dashBoardFiltersPerDb.value[dbName]) {
                    dashBoardFiltersPerDb.value[dbName] = {
                        accountIds: [] as number[],
                        period: 'last_month_until_now',
                        startDate: new Date(),
                        endDate: new Date(),
                        customStartDate: new Date(),
                        customEndDate: new Date(),
                        cumuleMode: 'week',
                        last_results: [] as TradeExtendedType[]
                    }
                }
                
                // Ensure dates are Date objects (localStorage restores them as strings)
                const filters = dashBoardFiltersPerDb.value[dbName]
                filters.startDate = filters.startDate instanceof Date ? filters.startDate : new Date(filters.startDate)
                filters.endDate = filters.endDate instanceof Date ? filters.endDate : new Date(filters.endDate)
                filters.customStartDate = filters.customStartDate instanceof Date ? filters.customStartDate : new Date(filters.customStartDate)
                filters.customEndDate = filters.customEndDate instanceof Date ? filters.customEndDate : new Date(filters.customEndDate)
                
                return filters
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                dashBoardFiltersPerDb.value[dbName] = val
            }
        })

        const dailyHistoryFilters = computed({
            get: () => {
                const dbName = getCurrentDbName()
                if (!dailyHistoryFiltersPerDb.value[dbName]) {
                    dailyHistoryFiltersPerDb.value[dbName] = {
                        symbols: [] as SymbolType[],
                        accountIds: [] as number[],
                        selectedMonth: formatDateToYYYYMM(new Date()),
                        showInactive: false,
                        isExpanded: false,
                        columnVisibility: ({
                            lot: true,
                            openDate: true,
                            closeDate: true,
                            symbol: true,
                            type: true,
                            openPrice: true,
                            closePrice: true,
                            profit: true,
                            grossProfit: false,
                            commission: false,
                        }),
                        last_results: [] as TradeExtendedType[]
                    }
                }
                return dailyHistoryFiltersPerDb.value[dbName]
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                dailyHistoryFiltersPerDb.value[dbName] = val
            }
        })

        const calendarFilters = computed({
            get: () => {
                const dbName = getCurrentDbName()
                if (!calendarFiltersPerDb.value[dbName]) {
                    calendarFiltersPerDb.value[dbName] = {
                        accountIds: [] as number[],
                        selectedMonth: formatDateToYYYYMM(new Date()),
                        last_results: [] as TradeExtendedType[]
                    }
                }
                return calendarFiltersPerDb.value[dbName]
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                calendarFiltersPerDb.value[dbName] = val
            }
        })

        const dashBoardResult = computed({
            get: () => {
                const dbName = getCurrentDbName()
                if (!dashBoardResultPerDb.value[dbName]) {
                    dashBoardResultPerDb.value[dbName] = {
                        pnl: 0,
                        appt: 0,
                        plRatio: 0,
                        winrate: 0,
                        profitFactor: 0,
                        recoveryFactor: 0,
                        sharpeRatio: 0,
                        tradesCount: 0,
                        grossPnl: 0,
                        totalContracts: 0,
                        avgTradeDuration: 0,
                        maxTradeDuration: 0,
                        expectancy: 0,
                        totalProfit: 0,
                        winningTradesCount: 0,
                        winningContractsCount: 0,
                        largestWin: 0,
                        avgWin: 0,
                        stdDevWin: 0,
                        avgWinDuration: 0,
                        maxWinDuration: 0,
                        maxRunUp: 0,
                        maxRunUpDateFrom: null as Date | null,
                        maxRunUpDateTo: null as Date | null,
                        maxWinningStreak: 0,
                        totalLoss: 0,
                        losingTradesCount: 0,
                        losingContractsCount: 0,
                        largestLoss: 0,
                        avgLoss: 0,
                        stdDevLoss: 0,
                        avgLossDuration: 0,
                        maxLossDuration: 0,
                        maxDrawdown: 0,
                        maxDrawdownDateFrom: null as Date | null,
                        maxDrawdownDateTo: null as Date | null,
                        maxLosingStreak: 0,
                        breakevenTradesCount: 0,
                        breakevenContractsCount: 0,
                    }
                }
                return dashBoardResultPerDb.value[dbName]
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                dashBoardResultPerDb.value[dbName] = val
            }
        })

        const columnVisibility = computed({
            get: () => {
                const dbName = getCurrentDbName()
                if (!columnVisibilityPerDb.value[dbName]) {
                    columnVisibilityPerDb.value[dbName] = {
                        openDate: true,
                        closeDate: true,
                        symbol: true,
                        type: true,
                        lot: true,
                        openPrice: true,
                        closePrice: true,
                        profit: true,
                        grossProfit: false,
                        commission: false,
                    }
                }
                return columnVisibilityPerDb.value[dbName]
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                columnVisibilityPerDb.value[dbName] = val
            }
        })

        const showDetailedNote = computed({
            get: () => {
                const dbName = getCurrentDbName()
                return showDetailedNotePerDb.value[dbName] ?? false
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                showDetailedNotePerDb.value[dbName] = val
            }
        })

        const getIsLogOpen = () => isLogOpen.value
        const getIsLogOpenFirstInit = () => logOpenFirstInit.value
        const getLogMessage = () => logMessage.value

        const setCookie = (key: string, val: unknown) => {
            const cookie = useCookie(key, {
                expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
            })
            cookie.value = val as string
        }

        const setLogOpen = (isOpen: boolean) => {
            isLogOpen.value = isOpen
            setCookie('showLog', isOpen)
        }

        const setLogMessage = (message: string) => {
            logMessage.value = message
        }

        const setLastViewedNoteId = (id: number | null) => {
            lastViewedNoteId.value = id
        }

        const setLogOpenFirstInit = (status: boolean) => {
            logOpenFirstInit.value = status
        }

        const addDebug1 = () => {
            logDebug1.value++
        }

        const addDebug2 = () => {
            logDebug2.value++
        }

        const addFix = () => {
            logFix.value++
        }

        function setUser(u: UserType | null) {
            user.value = u
        }

        function clearUser() {
            user.value = null
            dailyHistoryFilters.value.last_results = []
            calendarFilters.value.last_results = []
            dashBoardFilters.value.last_results = []
        }

        function shouldRefreshData() {
            return needsDataRefresh.value
        }

        function clearDataRefresh() {
            needsDataRefresh.value = false
        }

        function triggerDataRefresh() {
            needsDataRefresh.value = true
        }

        async function fetchUser() {
            try {
                let u: UserType | null = null
                if (import.meta.server) {
                    // On est côté serveur, il faut transmettre les cookies de la requête entrante
                    const headers = useRequestHeaders(['cookie'])
                    u = await auth.fetchUser(headers)
                } else {
                    // Côté client, le navigateur gère les cookies tout seul
                    u = await auth.fetchUser()
                }
                setUser(u)
                return u
            } catch {
                clearUser()
                return null
            }
        }

        function clearDatabaseData(dbName: string) {
            // Remove data from all *PerDb refs by creating new objects without the deleted key
            customInputsPerDb.value = Object.fromEntries(
                Object.entries(customInputsPerDb.value).filter(([key]) => key !== dbName)
            )
            dayTagsPerDb.value = Object.fromEntries(
                Object.entries(dayTagsPerDb.value).filter(([key]) => key !== dbName)
            )
            recentColorsPerDb.value = Object.fromEntries(
                Object.entries(recentColorsPerDb.value).filter(([key]) => key !== dbName)
            )
            recentColors2PerDb.value = Object.fromEntries(
                Object.entries(recentColors2PerDb.value).filter(([key]) => key !== dbName)
            )
            tradeOptionsPerDb.value = Object.fromEntries(
                Object.entries(tradeOptionsPerDb.value).filter(([key]) => key !== dbName)
            )
            dashBoardFiltersPerDb.value = Object.fromEntries(
                Object.entries(dashBoardFiltersPerDb.value).filter(([key]) => key !== dbName)
            )
            dailyHistoryFiltersPerDb.value = Object.fromEntries(
                Object.entries(dailyHistoryFiltersPerDb.value).filter(([key]) => key !== dbName)
            )
            calendarFiltersPerDb.value = Object.fromEntries(
                Object.entries(calendarFiltersPerDb.value).filter(([key]) => key !== dbName)
            )
            dashBoardResultPerDb.value = Object.fromEntries(
                Object.entries(dashBoardResultPerDb.value).filter(([key]) => key !== dbName)
            )
            columnVisibilityPerDb.value = Object.fromEntries(
                Object.entries(columnVisibilityPerDb.value).filter(([key]) => key !== dbName)
            )
            showDetailedNotePerDb.value = Object.fromEntries(
                Object.entries(showDetailedNotePerDb.value).filter(([key]) => key !== dbName)
            )
            lastViewedNoteIdPerDb.value = Object.fromEntries(
                Object.entries(lastViewedNoteIdPerDb.value).filter(([key]) => key !== dbName)
            )
        }

        return {
            noteAssocMode,
            isLogOpen,
            logOpenFirstInit,
            logMessage,
            logDebug1,
            logDebug2,
            logFix,
            isLoading,
            quickNavHistory,
            lastViewedNoteId,
            lastViewedNoteIdPerDb,
            conversionType,
            displayModeNet,
            recentColors,
            recentColors2,
            dayTags,
            tradeOptions,
            dashBoardFilters,
            dailyHistoryFilters,
            calendarFilters,
            dashBoardResult,
            columnVisibility,
            showDetailedNote,
            user,
            customInputs,
            // Expose internal refs for persistence
            customInputsPerDb,
            dayTagsPerDb,
            recentColorsPerDb,
            recentColors2PerDb,
            tradeOptionsPerDb,
            dashBoardFiltersPerDb,
            dailyHistoryFiltersPerDb,
            calendarFiltersPerDb,
            dashBoardResultPerDb,
            columnVisibilityPerDb,
            showDetailedNotePerDb,
            // Methods
            getCustomInput,
            updateCustomInput,
            addCustomItem,
            removeCustomItem,
            getIsLogOpen,
            getIsLogOpenFirstInit,
            getLogMessage,
            setCookie,
            setLogOpen,
            setLogMessage,
            setLogOpenFirstInit,
            setLastViewedNoteId,
            addDebug1,
            addDebug2,
            addFix,
            setUser,
            clearUser,
            shouldRefreshData,
            clearDataRefresh,
            triggerDataRefresh,
            fetchUser,
            clearDatabaseData,
        }
    },
    {
        persist: {
            storage: import.meta.client ? localStorage : false,
            paths: [
                // Global state
                'user',
                'isLogOpen',
                'logOpenFirstInit',
                'logMessage',
                'logDebug1',
                'logDebug2',
                'fixdebug',
                'needsDataRefresh',
                'quickNavHistory',
                'conversionType',
                'displayModeNet',
                'noteAssocMode',
                'lastViewedNoteIdPerDb',
                // Internal DB-specific storage (refs only, not computed)
                'customInputsPerDb',
                'dayTagsPerDb',
                'recentColorsPerDb',
                'recentColors2PerDb',
                'tradeOptionsPerDb',
                'dashBoardFiltersPerDb',
                'dailyHistoryFiltersPerDb',
                'calendarFiltersPerDb',
                'dashBoardResultPerDb',
                'columnVisibilityPerDb',
                'showDetailedNotePerDb',
            ],
        },
    }
)

export type UserStore = ReturnType<typeof useUserStore>