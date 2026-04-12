import { getAuthDb } from '~/server/utils/db'
import { createAppError } from '~/server/utils/errors'
import auth from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await auth(event)
	const userId = event.context.userId
	const dbName = event.context.dbName as string | undefined
	if (!userId) {
		throw createAppError({ statusCode: 401, message: 'Unauthorized', tag: 'api.plugins.unauthorized' })
	}
	if (!dbName) {
		throw createAppError({ statusCode: 400, message: 'No database selected', tag: 'api.plugins.active.no_database' })
	}

	try {
		const prisma = getAuthDb()
		const database = await prisma.database.findFirst({
			where: { userId: Number(userId), name: dbName },
			select: { metadata: true },
		})

		const metadata = (database?.metadata ?? {}) as Record<string, unknown>
		return (metadata.enabledPlugins as string[] | undefined) ?? []

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
