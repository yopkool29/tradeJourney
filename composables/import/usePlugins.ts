import { z } from 'zod'
import { TJPluginManifestSchema } from '~/schema/plugin'
import type { TJPluginManifest, TJPluginPageSlot } from '~/type/plugin'
import {
	cleanupPluginData,
	dispatchPluginLoadEvent,
	findPluginActionsByPluginId,
} from '~/utils/plugins-window'

export const usePlugins = () => {
	const plugins = ref<TJPluginManifest[]>([])
	const activePluginIds = ref<string[]>([])
	const loading = ref(false)
	const error = ref(false)
	const toggling = ref<string | null>(null)
	const reloading = ref<string | null>(null)

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

		// Clean up plugin data
		const pluginPageSlots = useState('pluginPageSlots', () => [] as TJPluginPageSlot[])
		cleanupPluginData(id, pluginPageSlots)
	}

	const reloadPlugin = async (id: string) => {
		reloading.value = id
		dispatchPluginLoadEvent(id)
		await new Promise(resolve => setTimeout(resolve, 800))
		reloading.value = null
	}

	const reloadActivePlugins = async () => {
		if (activePluginIds.value.length === 0) {
			await fetchPlugins()
		}
		for (const pluginId of activePluginIds.value) {
			reloadPlugin(pluginId)
		}
	}

	const togglePluginWithCleanup = async (id: string, enabled: boolean) => {
		const result = await togglePlugin(id, enabled)
		if (enabled) {
			dispatchPluginLoadEvent(id)
		} else {
			const pluginPageSlots = useState<{ pluginId: string }[]>('pluginPageSlots', () => [])
			cleanupPluginData(id, pluginPageSlots as unknown as { value: TJPluginPageSlot[] })
		}
		return result
	}

	const importPlugin = async (file: File) => {
		const formData = new FormData()
		formData.append('file', file)
		await $fetch('/api/plugins/import', {
			method: 'POST',
			body: formData,
		})
		await fetchPlugins()
	}

	const runPlugin = (id: string) => {
		const actions = findPluginActionsByPluginId(id)
		const action = actions?.[0]
		if (action) {
			action.run()
		}
	}

	return {
		plugins,
		activePluginIds,
		loading,
		error,
		toggling,
		reloading,
		isEnabled,
		fetchPlugins,
		togglePlugin,
		togglePluginWithCleanup,
		deletePlugin,
		importPlugin,
		runPlugin,
		reloadPlugin,
		reloadActivePlugins,
	}
}
