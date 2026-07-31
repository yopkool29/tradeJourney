export const useSessionCheck = () => {
    const CHECK_INTERVAL = 1 * 60 * 1000 // 1 minute
    const userStore = useUserStore()
    const { fetchUser, logout } = useAuth()
    const router = useRouter()

    let intervalId: NodeJS.Timeout | null = null

    const _checkSession = async () => {
        // Vérifier si l'utilisateur est toujours connecté
        if (!userStore.user) {
            stopSessionCheck()
            return
        }

        try {
            // Tenter de récupérer les infos utilisateur (vérifie le token)
            await fetchUser()
        } catch (error: any) {
            // Si erreur 401, le token est expiré ou invalide
            if (error?.statusCode === 401) {
                stopSessionCheck()
                await logout()
                await router.push('/login')
            }
        }
    }

    const startSessionCheck = () => {
        // Ne pas démarrer si déjà actif ou si pas d'utilisateur
        if (intervalId || !userStore.user) return

        intervalId = setInterval(async () => {
            await _checkSession()
        }, CHECK_INTERVAL)
    }

    const stopSessionCheck = () => {
        if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
        }
    }

    // Nettoyer l'intervalle quand le composant est démonté
    onUnmounted(() => {
        stopSessionCheck()
    })

    return { startSessionCheck, stopSessionCheck }
}
