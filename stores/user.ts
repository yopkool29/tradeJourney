import { format } from 'date-fns';
import type { SymbolType } from '~/schema/symbol'
import type { TradeExtendedType } from '~/schema/trade'
import type { DayTagType } from '~/schema/dayTag'
import type { UserType } from '~/schema/user'

interface CustomInput {
    items: string[]
    value: string
}

interface CustomInputs {
    [key: string]: CustomInput
}

export const useUserStore = defineStore(
    'userStore',
    () => {
        const isLogOpen = ref(false)
        const logOpenFirstInit = ref(true)
        const logMessage = ref('')
        const logDebug1 = ref(0)
        const logDebug2 = ref(0)
        const isLoading = ref(false)
        const auth = useAuth()

        // --- Custom inputs ---
        const customInputs = ref<CustomInputs>({})

        const getCustomInput = (name: string) =>
            customInputs.value[name] || { items: [], value: '' }

        const updateCustomInput = (name: string, items: string[], value: string) =>
            customInputs.value[name] = { items, value }

        const addCustomItem = (name: string, item: string) => {
            const current = getCustomInput(name)
            if (!current.items.includes(item)) {
                current.items.push(item)
                updateCustomInput(name, current.items, item)
            }
        }

        const removeCustomItem = (name: string, item: string) => {
            const current = getCustomInput(name)
            const newItems = current.items.filter(i => i !== item)
            updateCustomInput(name, newItems, current.value)
        }

        // --- Auth user state ---
        const user = ref<UserType | null>(null)

        const invalidationTable = ref<[boolean, boolean, boolean]>([false, false, false])

        // DayTags pour le journal de trading
        const dayTags = ref<DayTagType[]>([])

        const recentColors = ref<string[]>([])

        // Options de cumul (à adapter selon tes besoins)

        type ReportType = 'mt5' | 'nt8';
        
        const importOptions = ref({
            timezoneType: {
                'mt5' : 'Europe/Paris',
                'nt8' : 'Europe/Paris',
            } as Record<ReportType, string>,
            timezone: 'Europe/Paris',
            reportType: 'mt5' as ReportType
        })

        const tradeOptions = ref({
            accountIds: [] as number[], // Tableau vide = tous les comptes
            nbLines: 10,
            showInactive: false
        })

        const dashBoardFilters = ref({
            accountIds: [] as number[], // Tableau vide = tous les comptes
            period: 'Ce mois',
            startDate: new Date(),
            endDate: new Date(),
            cumuleMode: 'week',
            last_results: [] as TradeExtendedType[]
        })

        const dailyHistoryFilters = ref({
            symbols: [] as SymbolType[],
            accountIds: [] as number[], // Tableau vide = tous les comptes
            selectedMonth: format(new Date(), 'yyyy-MM'),
            columnVisibility: ({
                lot: false,
                openDate: false,
                closeDate: false,
                symbol: true,
                type: true,
                openPrice: true,
                closePrice: true,
                profit: true,
            }),
            last_results: [] as TradeExtendedType[]
        })

        const dashBoardResult = ref({
            pnl: 0,
            appt: 0,
            plRatio: 0,
            winrate: 0,
            profitFactor: 0,
            recoveryFactor: 0,
            sharpeRatio: 0,
        })

        // Visibilité dynamique des colonnes
        const columnVisibility = ref<Record<string, boolean>>({
            openDate: true,
            closeDate: false, // Par défaut invisible
            symbol: true,
            type: true,
            lot: true,
            openPrice: true,
            closePrice: true,
            profit: true,
            // Ajoute d'autres colonnes ici si besoin
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

        const setLogOpenFirstInit = (status: boolean) => {
            logOpenFirstInit.value = status
        }

        const addDebug1 = () => {
            logDebug1.value++
        }

        const addDebug2 = () => {
            logDebug2.value++
        }

        function setUser(u: UserType | null) {
            user.value = u
        }

        function clearUser() {
            user.value = null
        }

        function getInvalidationNum(num: number) {
            return invalidationTable.value[num]
        }

        function clearInvalidate(num: number) {
            invalidationTable.value[num] = false
        }

        function setInvalidate(num?: number) {
            // Si on était déconnecté et qu'on vient de se reconnecter
            if (num === undefined)
                invalidationTable.value = [true, true, true]
            else
                invalidationTable.value[num] = true
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

        return {
            isLogOpen,
            logOpenFirstInit,
            logMessage,
            logDebug1,
            logDebug2,
            isLoading,
            recentColors,
            dayTags,
            importOptions,
            tradeOptions,
            dashBoardFilters,
            dailyHistoryFilters,
            dashBoardResult,
            columnVisibility,
            user,
            customInputs,
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
            addDebug1,
            addDebug2,
            setUser,
            clearUser,
            getInvalidationNum,
            clearInvalidate,
            setInvalidate,
            fetchUser,
        }
    },
    {
        // TODO: fix this
        persist: {
            storage: import.meta.client ? localStorage : false,
        },
    }
)
