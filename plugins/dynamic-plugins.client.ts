import * as Vue from 'vue'
import type { TJPlugin, TJPluginSdk, TJPluginRegistered, TJPluginModalRegistered, TJPluginPageSlotRegistered } from '~/type/plugin'
import {
    getPNL,
    getAPPT,
    getPLRatio,
    getWinrate,
    getNbTrades,
    getWinLossNb,
    movingAverage,
    getProfitFactor,
    getRecoveryFactor,
    getSharpeRatio,
    getAvgTradeDuration,
    getMaxTradeDuration,
    getExpectancy,
    getStdDev,
    getTotalContracts,
    getWinningTradesMetrics,
    getLosingTradesMetrics,
    getBreakevenTradesMetrics,
    getMaxWinningStreak,
    getMaxLosingStreak,
    getMaxDrawdownWithDates,
    getMaxRunUpWithDates
} from '~/utils/tradeStats'
import {
    initPluginWindowGlobals,
    cleanupPluginData,
    isPluginLoaded,
    getPlugin,
    dispatchPluginOpenModalEvent,
    addPluginAction,
    addPluginModal,
    addPluginPageSlot,
    findPluginModal,
} from '~/utils/plugins-window'

declare global {
    interface Window {
        Vue: typeof Vue
        __TJ_SDK__: TJPluginSdk
        __TJ_PLUGINS__: TJPlugin[]
        __TJ_PLUGIN_ACTIONS__: TJPluginRegistered[]
        __TJ_PLUGIN_MODALS__: TJPluginModalRegistered[]
        __TJ_PLUGIN_PAGE_SLOTS__: TJPluginPageSlotRegistered[]
    }
}

export default defineNuxtPlugin(async () => {
    window.Vue = Vue
    initPluginWindowGlobals()

    const pluginPageSlots = useState<TJPluginPageSlotRegistered[]>('pluginPageSlots', () => [])
    pluginPageSlots.value = []

    const toast = useAppToast()
    let currentInstallingPluginId = ''

    const sdk: TJPluginSdk = {
        api: {
            get: (path: string) => $fetch(path),
            post: (path: string, body: Record<string, unknown>) => $fetch(path, { method: 'POST', body }),
            put: (path: string, body: Record<string, unknown>) => $fetch(path, { method: 'PUT', body }),
            delete: (path: string) => $fetch(path, { method: 'DELETE' }),
        },
        utils: {
            getPNL,
            getAPPT,
            getPLRatio,
            getWinrate,
            getNbTrades,
            getWinLossNb,
            movingAverage,
            getProfitFactor,
            getRecoveryFactor,
            getSharpeRatio,
            getAvgTradeDuration,
            getMaxTradeDuration,
            getExpectancy,
            getStdDev,
            getTotalContracts,
            getWinningTradesMetrics,
            getLosingTradesMetrics,
            getBreakevenTradesMetrics,
            getMaxWinningStreak,
            getMaxLosingStreak,
            getMaxDrawdownWithDates,
            getMaxRunUpWithDates,
        },
        ui: {
            toast: {
                success: (message: string) => toast.success(message),
                error: (message: string) => toast.error(message),
            },
            registerAction: (action) => {
                addPluginAction(action)
            },
            registerModal: (modal) => {
                addPluginModal(modal)
            },
            openModal: (id: string) => {
                const modal = findPluginModal(id)
                if (modal) {
                    dispatchPluginOpenModalEvent(id)
                }
            },
            registerPageSlot: (slotId: string, config: { id: string; label: string; icon?: string; onClick: () => void }) => {
                const pluginId = currentInstallingPluginId
                addPluginPageSlot(slotId, config, pluginId, pluginPageSlots)
            },
        },
    }

    window.__TJ_SDK__ = sdk

    // Function to load a single plugin
    const loadPlugin = async (pluginId: string, forceReload = false) => {
        // Clean old plugin data if force reload
        if (forceReload) {
            cleanupPluginData(pluginId, pluginPageSlots)
        }

        // Check if already loaded (prevent duplicates)
        if (isPluginLoaded(pluginId) && !forceReload) {
            console.log(`[TJ Plugins] "${pluginId}" already loaded, skipping`)
            return true
        }

        try {
            const scriptUrl = `/api/plugins/file/${pluginId}?v=${Date.now()}`
            await import(/* @vite-ignore */ scriptUrl)
            const plugin = getPlugin(pluginId)
            if (plugin && plugin.install) {
                currentInstallingPluginId = pluginId
                plugin.install(sdk)
                currentInstallingPluginId = ''
                console.log(`[TJ Plugins] Loaded "${pluginId}"`)
                return true
            } else {
                console.error(`[TJ Plugins] Plugin "${pluginId}" not found on window`)
                return false
            }
        } catch (err) {
            console.error(`[TJ Plugins] Failed to load plugin "${pluginId}":`, err)
            return false
        }
    }

    // Listen for dynamic plugin load requests (force reload for hot-reload support)
    window.addEventListener('tj-plugin-load', ((e: CustomEvent<{ pluginId: string }>) => {
        loadPlugin(e.detail.pluginId, true)
    }) as EventListener)

    // Load initially active plugins
    try {
        const activePluginIds = await $fetch('/api/plugins/active') as string[]
        for (const pluginId of activePluginIds) {
            await loadPlugin(pluginId)
        }
    } catch {
        // Silently handle auth errors during initial load
        console.log('[TJ Plugins] Could not load active plugins (user not authenticated or no database selected)')
    }
})
