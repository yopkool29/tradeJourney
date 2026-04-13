export interface QuickNavItem {
    path: string
    label: string
    icon: string
}

const MAX_SHORTCUTS = 5

// Trackable pages (top-level only, no individual tabs)
const NAV_PAGES: Record<string, { labelKey: string; icon: string }> = {
    '/dashboard': { labelKey: 'components.app_header.menu_items.dashboard', icon: 'i-lucide-chart-bar' },
    '/calendar': { labelKey: 'pages.trades.tabs.calendar', icon: 'i-lucide-calendar' },
    '/daily': { labelKey: 'pages.trades.tabs.daily', icon: 'i-lucide-calendar-days' },
    '/main': { labelKey: 'pages.trades.tabs.trades', icon: 'i-lucide-receipt-text' },
    '/settings': { labelKey: 'components.app_header.menu_items.settings', icon: 'i-heroicons-cog-6-tooth' },
}

export const useQuickNav = () => {
    const { t } = useI18n()
    const router = useRouter()
    const route = useRoute()
    const userStore = useUserStore()

    // Record a visit to the current page
    const recordVisit = () => {
        const path = route.path
        if (!NAV_PAGES[path]) return

        const now = Date.now()
        const idx = userStore.quickNavHistory.findIndex((e: { path: string; lastVisit: number }) => e.path === path)
        if (idx >= 0) {
            userStore.quickNavHistory[idx].lastVisit = now
        } else {
            userStore.quickNavHistory.push({ path, lastVisit: now })
        }
    }

    // Shortcuts: pages sorted by most recently visited
    const shortcuts = computed<QuickNavItem[]>(() => {
        return [...userStore.quickNavHistory]
            .filter(e => NAV_PAGES[e.path])
            .sort((a, b) => b.lastVisit - a.lastVisit)
            .slice(0, MAX_SHORTCUTS)
            .map(e => ({
                path: e.path,
                label: t(NAV_PAGES[e.path].labelKey),
                icon: NAV_PAGES[e.path].icon,
            }))
    })

    // Navigate to a shortcut
    const navigateToShortcut = (item: QuickNavItem) => {
        router.push(item.path)
    }

    // Go back to previous page
    const goBack = () => {
        // Get navigation history, exclude current page
        const history = userStore.quickNavHistory.filter((item: { path: string; lastVisit: number }) => item.path !== route.path)
        
        if (history.length > 0) {
            // Sort by most recent visit and take the first one
            const previousPage = history.sort((a: { lastVisit: number }, b: { lastVisit: number }) => b.lastVisit - a.lastVisit)[0]
            router.push(previousPage.path)
        } else {
            // If no history, go to dashboard by default
            router.push('/dashboard')
        }
    }

    // Auto-record visits on route change
    if (import.meta.client) {
        watch(() => route.path, () => {
            setTimeout(recordVisit, 50)
        }, { immediate: true })
    }

    return {
        shortcuts,
        navigateToShortcut,
        goBack,
    }
}
