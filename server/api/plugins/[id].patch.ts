import { getAuthDb } from '~/server/utils/db'
import { createAppError } from '~/server/utils/errors'
import auth from '~/server/utils/auth'
import type { Prisma } from '~/generated/prisma-auth'

export default defineEventHandler(async (event) => {
	await auth(event)
	const userId = event.context.userId
	const dbName = event.context.dbName as string | undefined
	if (!userId) {
		throw createAppError({ statusCode: 401, message: 'Unauthorized', tag: 'api.plugins.unauthorized' })
	}
	if (!dbName) {
		throw createAppError({ statusCode: 400, message: 'No database selected', tag: 'api.plugins.toggle.no_database' })
	}

	try {
		const prisma = getAuthDb()
		const pluginId = getRouterParam(event, 'id')
		const body = await readBody<{ enabled: boolean }>(event)

		if (!pluginId) {
			throw createAppError({ statusCode: 400, message: 'Plugin ID is required', tag: 'api.plugins.toggle.missing_id' })
		}

		const database = await prisma.database.findFirst({
			where: { userId: Number(userId), name: dbName },
			select: { id: true, metadata: true },
		})

		if (!database) {
			throw createAppError({ statusCode: 404, message: 'Database not found', tag: 'api.plugins.toggle.no_database' })
		}

		const metadata = (database.metadata ?? {}) as Record<string, unknown>
		const enabledPlugins: string[] = (metadata.enabledPlugins as string[] | undefined) ?? []

		const updated = body.enabled
			? [...new Set([...enabledPlugins, pluginId])]
			: enabledPlugins.filter((id: string) => id !== pluginId)

		metadata.enabledPlugins = updated

		await prisma.database.update({
			where: { id: database.id },
			data: { metadata: metadata as Prisma.InputJsonValue },
		})

		return { enabledPlugins: updated }

	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({
			statusCode: 500,
			message: 'An error occurred while toggling plugin',
			tag: 'api.plugins.toggle.server_error',
			error
		})
	}
})
