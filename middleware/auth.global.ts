// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineNuxtRouteMiddleware(async (to, from) => {
    const userStore = useUserStore()
    const { currentDatabase } = useDatabase()

    // Liste des routes publiques
    // const publicPages = ['/', '/login', '/register', '/forgot-password', '/test']
    const publicPages = ['/', '/login', '/register', '/forgot-password']

    // useLog.log_info('Auth middleware', { to, from })

    // Si la route est publique, ne rien faire
    if (publicPages.includes(to.path)) return

    // Sélection de base de données et backup/restore : juste vérifier l'auth
    // (pas besoin de DB active pour ces pages)
    if (to.path === '/select-database' || to.path === '/backup-restore') {
        if (userStore.user) return
        await userStore.fetchUser()
        if (!userStore.user) {
            return navigateTo('/login')
        }
        return
    }

    // Si déjà connecté, vérifier qu'une database est sélectionnée
    if (userStore.user) {
        if (!currentDatabase.value) {
            return navigateTo('/login')
        }
        return
    }

    // Sinon, tente un auto-login (cookie JWT)
    await userStore.fetchUser()

    // Si toujours pas connecté, redirige vers /login
    if (!userStore.user) {
        return navigateTo({
            path: '/login',
            query: { redirect: to.path }
        })
    }

    // Connecté via auto-login mais pas de database
    if (!currentDatabase.value) {
        return navigateTo('/login')
    }
})