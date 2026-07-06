import { readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { existsSync } from 'fs'

type DevPlugin = {
	id: string
	name: string
	version: string
	description: string
	isDev: true
}

export const getDevPluginIds = (): string[] => {
	const raw = process.env.DEV_PLUGINS
	if (!raw) return []
	return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export const getDevPlugins = async (): Promise<DevPlugin[]> => {
	const ids = getDevPluginIds()
	if (ids.length === 0) return []

	const result: DevPlugin[] = []
	for (const id of ids) {
		const manifestPath = resolve(process.cwd(), 'plugins-dev', id, 'manifest.json')
		if (!existsSync(manifestPath)) continue
		try {
			const content = await readFile(manifestPath, 'utf-8')
			const manifest = JSON.parse(content)
			result.push({
				id: manifest.id || id,
				name: manifest.name || id,
				version: manifest.version || '0.0.0',
				description: manifest.description || '',
				isDev: true,
			})
		} catch {
			// Skip invalid manifests
		}
	}
	return result
}

export const isDevPlugin = (pluginId: string): boolean => {
	return getDevPluginIds().includes(pluginId)
}

export const getDevPluginFilePath = (pluginId: string): string => {
	return join(resolve(process.cwd(), 'plugins-dev', '_release', pluginId), 'plugin.umd.cjs')
}
