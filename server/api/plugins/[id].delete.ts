import { rm } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { getDataDb } from '~/server/utils/db'
import { createAppError } from '~/server/utils/errors'
import { getPluginUploadPath } from '~/server/utils/index'
import auth from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await auth(event)
	const userId = event.context.userId as number
	const dbName = event.context.dbName as string | undefined
	if (!userId) {
		throw createAppError({ statusCode: 401, message: 'Unauthorized', tag: 'api.plugins.delete.unauthorized' })
	}
	if (!dbName) {
		throw createAppError({ statusCode: 400, message: 'No database selected', tag: 'api.plugins.delete.no_database' })
	}

	try {
		const pluginId = getRouterParam(event, 'id')
		if (!pluginId) {
			throw createAppError({ statusCode: 400, message: 'Plugin ID is required', tag: 'api.plugins.delete.missing_id' })
		}

		if (pluginId.includes('..') || pluginId.includes('/')) {
			throw createAppError({ statusCode: 400, message: 'Invalid plugin ID', tag: 'api.plugins.delete.invalid_id' })
		}

		const prisma = await getDataDb(userId, dbName)
		const plugin = await prisma.plugin.findUnique({ where: { id: pluginId } })
		if (!plugin) {
			throw createAppError({ statusCode: 404, message: 'Plugin not found or is a system plugin', tag: 'api.plugins.delete.not_found' })
		}

		// Delete from DB
		await prisma.plugin.delete({ where: { id: pluginId } })

		// Delete plugin folder from filesystem if exists
		const pluginDir = resolve(process.cwd(), getPluginUploadPath(userId, dbName), pluginId)
		if (existsSync(pluginDir)) {
			await rm(pluginDir, { recursive: true, force: true })
		}

		return { success: true, pluginId }

	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({
			statusCode: 500,
			message: 'Failed to delete plugin',
			tag: 'api.plugins.delete.server_error',
			error
		})
	}
})
