import * as Vue from 'vue'
import type { TJPlugin, TJPluginSdk, TJPluginRegistered, TJPluginModalRegistered, TJPluginPageSlotRegistered } from '~/type/plugin'

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
	window.__TJ_PLUGIN_ACTIONS__ = []
	window.__TJ_PLUGIN_MODALS__ = []
	window.__TJ_PLUGIN_PAGE_SLOTS__ = []

	const toast = useAppToast()

	const sdk: TJPluginSdk = {
		api: {
			get: (path: string) => $fetch(path),
			post: (path: string, body: unknown) => $fetch(path, { method: 'POST', body }),
			put: (path: string, body: unknown) => $fetch(path, { method: 'PUT', body }),
			delete: (path: string) => $fetch(path, { method: 'DELETE' }),
		},
		ui: {
			toast: {
				success: (message: string) => toast.success(message),
				error: (message: string) => toast.error(message),
			},
			registerAction: (action) => {
				window.__TJ_PLUGIN_ACTIONS__.push(action)
			},
			registerModal: (modal) => {
				window.__TJ_PLUGIN_MODALS__.push(modal)
			},
			openModal: (id: string) => {
				const modal = window.__TJ_PLUGIN_MODALS__.find(m => m.id === id)
				if (modal) {
					window.dispatchEvent(new CustomEvent('tj-plugin-open-modal', { detail: { id } }))
				}
			},
			registerPageSlot: (slotId: string, config: { id: string; label: string; icon?: string; onClick: () => void }) => {
				// Get plugin id from stack trace (approximate)
				const pluginId = config.id.split('-')[0] || 'unknown'
				window.__TJ_PLUGIN_PAGE_SLOTS__.push({
					id: config.id,
					slotId,
					pluginId,
					label: config.label,
					icon: config.icon,
					onClick: config.onClick,
				})
			},
		},
	}

	window.__TJ_SDK__ = sdk

	// Function to load a single plugin
	const loadPlugin = async (pluginId: string, forceReload = false) => {
		// Clean old plugin data if force reload
		if (forceReload) {
			window.__TJ_PLUGIN_ACTIONS__ = window.__TJ_PLUGIN_ACTIONS__.filter(a => !a.id.startsWith(pluginId))
			window.__TJ_PLUGIN_MODALS__ = window.__TJ_PLUGIN_MODALS__.filter(m => !m.id.startsWith(pluginId))
			window.__TJ_PLUGIN_PAGE_SLOTS__ = window.__TJ_PLUGIN_PAGE_SLOTS__.filter(s => s.pluginId !== pluginId)
			delete (window as unknown as { [key: string]: unknown })[pluginId]
		}

		// Check if already loaded (prevent duplicates)
		const existing = (window as unknown as { [key: string]: TJPlugin })[pluginId]
		if (existing && !forceReload) {
			console.log(`[TJ Plugins] "${pluginId}" already loaded, skipping`)
			return true
		}

		try {
			const scriptUrl = `/api/plugins/file/${pluginId}?v=${Date.now()}`
			await import(/* @vite-ignore */ scriptUrl)
			const plugin = (window as unknown as { [key: string]: TJPlugin })[pluginId]
			if (plugin && plugin.install) {
				plugin.install(sdk)
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
	} catch (err) {
		console.error('[TJ Plugins] Failed to fetch active plugins:', err)
	}
})
