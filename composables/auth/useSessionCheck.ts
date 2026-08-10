export const useSessionCheck = () => {
    const CHECK_INTERVAL = 1 * 60 * 1000 // 1 minute
    const userStore = useUserStore()
    const { logout } = useAuth()
    const config = useRuntimeConfig()

    let intervalId: NodeJS.Timeout | null = null

    const _checkSession = async () => {
        // Vérifier si l'utilisateur est toujours connecté
        if (!userStore.user) {
            stopSessionCheck()
            return
        }

        try {
            // Lightweight check — just verifies the token is still valid.
            // No settings/metadata returned, no UI state overwrite.
            await $fetch('/api/auth/check')
        } catch (error: unknown) {
            // Si erreur 401, le token est expiré ou invalide
            if ((error as { statusCode?: number })?.statusCode === 401) {
                stopSessionCheck()
                await logout()
                if (config.public.logoutHardReload) {
                    window.location.href = '/login'
                } else {
                    navigateTo('/login')
                }
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
