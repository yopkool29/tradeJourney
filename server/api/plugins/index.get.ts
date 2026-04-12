import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { TJPluginManifest } from '~/type/plugin'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'
import { getDataDb } from '~/server/utils/db'

async function scanSystemPlugins(dirPath: string): Promise<TJPluginManifest[]> {
	let dirs: string[] = []
	try {
		dirs = await readdir(dirPath)
	} catch {
		return []
	}

	const manifests: TJPluginManifest[] = []
	for (const dir of dirs) {
		try {
			const content = await readFile(join(dirPath, dir, 'manifest.json'), 'utf-8')
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
		const pluginMap = new Map<string, TJPluginManifest>()

		// System plugins (plugins-prod/) — not isUploaded
		const systemPlugins = await scanSystemPlugins(join(process.cwd(), 'plugins-prod'))
		for (const plugin of systemPlugins) {
			pluginMap.set(plugin.id, plugin)
		}

		// DB plugins — take precedence, marked as isUploaded
		if (dbName) {
			const prisma = await getDataDb(userId, dbName)
			const dbPlugins = await prisma.plugin.findMany()
			for (const plugin of dbPlugins) {
				pluginMap.set(plugin.id, {
					id: plugin.id,
					name: plugin.name,
					version: plugin.version,
					description: plugin.description,
					isUploaded: true,
				})
			}
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
