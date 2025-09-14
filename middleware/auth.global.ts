// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineNuxtRouteMiddleware(async (to, from) => {
    const userStore = useUserStore()

    // Liste des routes publiques
    const publicPages = ['/', '/login', '/register', '/forgot-password', '/test']

    // useLog.log_info('Auth middleware', { to, from })

    // Si la route est publique, ne rien faire
    if (publicPages.includes(to.path)) return

    // Si déjà connecté, ok
    if (userStore.user) {
        return
    }

    // Sinon, tente un auto-login (cookie JWT)
    await userStore.fetchUser()

    // Si toujours pas connecté, redirige vers /login
    if (!userStore.user) {
        return navigateTo('/login')
    }
})