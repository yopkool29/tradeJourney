import { z } from 'zod'
import { TJPluginManifestSchema } from '~/schema/plugin'
import type { TJPluginManifest } from '~/type/plugin'

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

	return {
		plugins,
		activePluginIds,
		loading,
		error,
		toggling,
		isEnabled,
		fetchPlugins,
		togglePlugin,
	}
}
