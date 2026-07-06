import { getDataDb } from '~/server/utils/db'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'
import { getDevPlugins } from '~/server/utils/devPlugins'

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		const userId = event.context.userId as number

		if (!userId) {
			throw createAppError({ statusCode: 401, message: 'Unauthorized', tag: 'api.plugins.unauthorized' })
		}

		const dbName = event.context.dbName as string | undefined

		if (!dbName) {
			throw createAppError({ message: 'No database selected', statusCode: 400, tag: 'PLUGIN_IMPORT_NO_DATABASE' })
		}

		const prisma = await getDataDb(userId, dbName)
		const dbPlugins = await prisma.plugin.findMany()

		const dbPluginList = dbPlugins.map(plugin => ({
			id: plugin.id,
			name: plugin.name,
			version: plugin.version,
			description: plugin.description,
			isUploaded: true,
		}))

		const devPlugins = await getDevPlugins()
		const dbIds = new Set(dbPluginList.map(p => p.id))
		const devPluginList = devPlugins
			.filter(dp => !dbIds.has(dp.id))
			.map(dp => ({
				id: dp.id,
				name: dp.name,
				version: dp.version,
				description: dp.description,
				isUploaded: true,
				isDev: true,
			}))

		return [...dbPluginList, ...devPluginList]
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
