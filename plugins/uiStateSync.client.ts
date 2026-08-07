export default defineNuxtPlugin(() => {
    if (import.meta.server) return

    const userStore = useUserStore()

    const onBeforeUnload = () => {
        if (!userStore.user) return
        const { saveUiStateBeacon } = useUiStateSync()
        saveUiStateBeacon()
    }

    window.addEventListener('beforeunload', onBeforeUnload)

    // Also save on page visibility change (mobile, tab switch)
    const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden' && userStore.user) {
            const { saveUiStateBeacon } = useUiStateSync()
            saveUiStateBeacon()
        }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
})
