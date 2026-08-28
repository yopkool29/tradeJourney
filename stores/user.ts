import { defineStore } from 'pinia'
import type { UserType, SettingsContentType } from '~/schema/user'

export const useUserStore = defineStore(
    'userStore',
    () => {
        // --- Global state (not DB-specific) ---
        const noteAssocMode = ref<'copy' | 'move'>('copy')

        const isLogOpen = ref(false)
        const logOpenFirstInit = ref(true)
        const logMessage = ref('')
        const logDebug1 = ref(0)
        const logDebug2 = ref(0)
        const logFix = ref(0)

        const isLoading = ref(false)
        const polygonRequestCount = ref(0)
        const quickNavHistory = ref<{ path: string; lastVisit: number }[]>([])
        const displayModeNet = ref<boolean>(true)
        const auth = useAuth()

        // --- Auth user state (global) ---
        const user = ref<UserType | null>(null)
        const needsDataRefresh = ref<boolean>(false)

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
            logMessage.value = message.length > 8192 ? message.slice(-8192) : message
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

        const settingsObject = computed<Partial<SettingsContentType> | null>(() => user.value?.settings_object as Partial<SettingsContentType> | null ?? null)

        function clearUser() {
            user.value = null
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
            useDbStateStore().clearDatabaseData(dbName)
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
            polygonRequestCount,
            quickNavHistory,
            displayModeNet,
            user,
            needsDataRefresh,
            // Methods
            getIsLogOpen,
            getIsLogOpenFirstInit,
            getLogMessage,
            setCookie,
            setLogOpen,
            setLogMessage,
            setLogOpenFirstInit,
            addDebug1,
            addDebug2,
            addFix,
            setUser,
            clearUser,
            settingsObject,
            shouldRefreshData,
            clearDataRefresh,
            triggerDataRefresh,
            fetchUser,
            clearDatabaseData,
        }
    },
    {
        persist: {
            storage: import.meta.client ? localStorage : undefined,
            pick: [
                'user',
                'isLogOpen',
                'logOpenFirstInit',
                'logMessage',
                'logDebug1',
                'logDebug2',
                'fixdebug',
                'needsDataRefresh',
                'displayModeNet',
                'noteAssocMode',
            ],
        },
    }
)

export type UserStore = ReturnType<typeof useUserStore>