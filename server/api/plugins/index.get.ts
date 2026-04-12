import { getDataDb } from '~/server/utils/db'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
	await auth(event)

    const userId = event.context.userId as number

    if (!userId) {
        throw createAppError({ statusCode: 401, message: 'Unauthorized', tag: 'api.plugins.unauthorized' })
    }
    const dbName = event.context.dbName as string | undefined

    if (!dbName) {
        throw createAppError({ message: 'No database selected', statusCode: 400, tag: 'PLUGIN_IMPORT_NO_DATABASE' })
    }

	try {

		const prisma = await getDataDb(userId, dbName)
		const dbPlugins = await prisma.plugin.findMany()
		
		return dbPlugins.map(plugin => ({
			id: plugin.id,
			name: plugin.name,
			version: plugin.version,
			description: plugin.description,
			isUploaded: true,
		}))

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
