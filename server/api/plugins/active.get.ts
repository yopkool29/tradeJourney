import { getDataDb } from '~/server/utils/db'
import { createAppError } from '~/server/utils/errors'
import auth from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		const userId = event.context.userId as number
		const dbName = event.context.dbName as string | undefined

		if (!userId) {
			throw createAppError({ statusCode: 401, message: 'Unauthorized', tag: 'api.plugins.unauthorized' })
		}

		if (!dbName) {
			throw createAppError({ statusCode: 400, message: 'No database selected', tag: 'api.plugins.active.no_database' })
		}

		const prisma = await getDataDb(userId, dbName)
		const plugins = await prisma.plugin.findMany({ where: { enabled: true }, select: { id: true } })
		return plugins.map(p => p.id)
	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({
			statusCode: 500,
			message: 'An error occurred while retrieving active plugins',
			tag: 'api.plugins.active.server_error',
			error
		})
	}
})
