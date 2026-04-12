import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { TJPluginManifest } from '~/type/plugin'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		const pluginsDir = join(process.cwd(), 'plugins-prod')

		let dirs: string[] = []
		try {
			dirs = await readdir(pluginsDir)
		} catch {
			return []
		}

		const manifests: TJPluginManifest[] = []

		for (const dir of dirs) {
			try {
				const manifestPath = join(pluginsDir, dir, 'manifest.json')
				const content = await readFile(manifestPath, 'utf-8')
				manifests.push(JSON.parse(content) as TJPluginManifest)
			} catch {
				// Ignorer les répertoires sans manifest valide
			}
		}

		return manifests

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
