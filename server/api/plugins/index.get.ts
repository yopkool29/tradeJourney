import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { TJPluginManifest } from '~/type/plugin'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'

// Helper to scan a directory for plugin manifests
async function scanPluginsDir(dirPath: string): Promise<TJPluginManifest[]> {
	let dirs: string[] = []
	try {
		dirs = await readdir(dirPath)
	} catch {
		return []
	}

	const manifests: TJPluginManifest[] = []
	for (const dir of dirs) {
		try {
			const manifestPath = join(dirPath, dir, 'manifest.json')
			const content = await readFile(manifestPath, 'utf-8')
			manifests.push(JSON.parse(content) as TJPluginManifest)
		} catch {
			// Ignore directories without valid manifest
		}
	}
	return manifests
}

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		// Scan both system plugins and user-uploaded plugins
		const [systemPlugins, uploadedPlugins] = await Promise.all([
			scanPluginsDir(join(process.cwd(), 'plugins-prod')),
			scanPluginsDir(join(process.cwd(), 'plugins-upload')),
		])

		// Merge and deduplicate by plugin id (uploaded plugins take precedence)
		const pluginMap = new Map<string, TJPluginManifest>()
		for (const plugin of systemPlugins) {
			pluginMap.set(plugin.id, plugin)
		}
		for (const plugin of uploadedPlugins) {
			pluginMap.set(plugin.id, { ...plugin, isUploaded: true } as TJPluginManifest)
		}

		return Array.from(pluginMap.values())

	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({
			statusCode: 500,
			message: 'An error occurred while retrieving plugins',
			tag: 'api.plugins.list.server_error',
			error
		})
	}
})
