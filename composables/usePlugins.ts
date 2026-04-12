import { z } from 'zod'
import { TJPluginManifestSchema } from '~/schema/plugin'
import type { TJPluginManifest, TJPluginPageSlot } from '~/type/plugin'

export const usePlugins = () => {
	const plugins = ref<TJPluginManifest[]>([])
	const activePluginIds = ref<string[]>([])
	const loading = ref(false)
	const error = ref(false)
	const toggling = ref<string | null>(null)

	const isEnabled = (id: string) => activePluginIds.value.includes(id)

	const fetchPlugins = async () => {
		loading.value = true
		error.value = false
		try {
			const [all, active] = await Promise.all([
				$fetch('/api/plugins'),
				$fetch('/api/plugins/active'),
			])
			plugins.value = z.array(TJPluginManifestSchema).parse(all)
			activePluginIds.value = z.array(z.string()).parse(active)
		} catch {
			error.value = true
		} finally {
			loading.value = false
		}
	}

	const togglePlugin = async (id: string, enabled: boolean) => {
		toggling.value = id
		try {
			const result = await $fetch(`/api/plugins/${id}`, {
				method: 'PATCH',
				body: { enabled },
			})
			const parsed = z.object({ enabledPlugins: z.array(z.string()) }).parse(result)
			activePluginIds.value = parsed.enabledPlugins
			return parsed
		} finally {
			toggling.value = null
		}
	}

	const deletePlugin = async (id: string) => {
		await $fetch(`/api/plugins/${id}`, { method: 'DELETE' })
		plugins.value = plugins.value.filter(p => p.id !== id)
		activePluginIds.value = activePluginIds.value.filter(pid => pid !== id)
		
		// Clean up page slots for this plugin
		const pluginPageSlots = useState('pluginPageSlots', () => [] as TJPluginPageSlot[])
		pluginPageSlots.value = pluginPageSlots.value.filter(s => s.pluginId !== id)
		window.__TJ_PLUGIN_PAGE_SLOTS__ = pluginPageSlots.value
		
		// Clean up plugin actions and modals
		window.__TJ_PLUGIN_ACTIONS__ = window.__TJ_PLUGIN_ACTIONS__.filter(a => !a.id.startsWith(id))
		window.__TJ_PLUGIN_MODALS__ = window.__TJ_PLUGIN_MODALS__.filter(m => !m.id.startsWith(id))
		
		// Remove plugin reference
		;(window as unknown as { [key: string]: unknown })[id] = undefined
	}

	return {
		plugins,
		activePluginIds,
		loading,
		error,
		toggling,
		isEnabled,
		fetchPlugins,
		togglePlugin,
		deletePlugin,
	}
}
