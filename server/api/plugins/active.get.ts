import { getAuthDb } from '~/server/utils/db'
import { createAppError } from '~/server/utils/errors'
import auth from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await auth(event)
	const userId = event.context.userId
	if (!userId) {
		throw createAppError({ statusCode: 401, message: 'Unauthorized', tag: 'api.plugins.unauthorized' })
	}

	try {
		const prisma = getAuthDb()
		const user = await prisma.user.findUnique({
			where: { id: Number(userId) },
			select: { settings: true },
		})

		const settings = JSON.parse(user?.settings || '{}')
		return (settings.enabledPlugins as string[] | undefined) ?? []

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
