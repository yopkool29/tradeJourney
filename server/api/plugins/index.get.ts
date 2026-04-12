import { readdir, readFile } from 'fs/promises'
import { join, resolve } from 'path'
import type { TJPluginManifest } from '~/type/plugin'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'
import { getPluginUploadPath } from '~/server/utils/index'

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
	const userId = event.context.userId as number
	const dbName = event.context.dbName as string | undefined

	try {
		const uploadedPluginsDir = dbName
			? resolve(process.cwd(), getPluginUploadPath(userId, dbName))
			: null

		// Scan system plugins and per-DB uploaded plugins
		const [systemPlugins, uploadedPlugins] = await Promise.all([
			scanPluginsDir(join(process.cwd(), 'plugins-prod')),
			uploadedPluginsDir ? scanPluginsDir(uploadedPluginsDir) : Promise.resolve([]),
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
