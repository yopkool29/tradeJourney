import { readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import { createAppError } from '~/server/utils/errors'
import auth from '~/server/utils/auth'
import { getPluginUploadPath } from '~/server/utils/index'
import { validatePluginId } from '~/server/utils/pluginHelpers'
import { isDevPlugin, getDevPluginFilePath } from '~/server/utils/devPlugins'

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		if (!event.context.userId) {
			throw createAppError({ statusCode: 401, message: 'Unauthorized', tag: 'api.plugins.file.unauthorized' })
		}

		const pluginId = getRouterParam(event, 'id')
		validatePluginId(pluginId)

		const userId = event.context.userId as number
		const dbName = event.context.dbName as string | undefined

		if (!dbName) {
			throw createAppError({ statusCode: 400, message: 'No database selected', tag: 'api.plugins.file.no_database' })
		}

		let filePath: string
		if (isDevPlugin(pluginId as string)) {
			filePath = getDevPluginFilePath(pluginId as string)
		} else {
			filePath = join(resolve(process.cwd(), getPluginUploadPath(userId, dbName)), pluginId as string, 'plugin.umd.cjs')
		}

		if (!existsSync(filePath)) {
			throw createAppError({ statusCode: 404, message: 'Plugin file not found', tag: 'api.plugins.file.not_found' })
		}

		const content = await readFile(filePath, 'utf-8')
		setResponseHeader(event, 'Content-Type', 'application/javascript')
		setResponseHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')
		setResponseHeader(event, 'Pragma', 'no-cache')
		setResponseHeader(event, 'Expires', '0')
		return content
	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({
			statusCode: 500,
			message: 'Failed to fetch plugin file',
			tag: 'api.plugins.file.error',
			error
		})
	}
})
