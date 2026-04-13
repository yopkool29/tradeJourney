import { getDataDb } from '~/server/utils/db'
import { createAppError } from '~/server/utils/errors'
import { validatePluginId } from '~/server/utils/pluginHelpers'
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
			throw createAppError({ statusCode: 400, message: 'No database selected', tag: 'api.plugins.toggle.no_database' })
		}

		const pluginId = getRouterParam(event, 'id')
		validatePluginId(pluginId)
		const body = await readBody<{ enabled: boolean }>(event)

		const prisma = await getDataDb(userId, dbName)
		await prisma.plugin.update({
			where: { id: pluginId },
			data: { enabled: body.enabled },
		})

		const enabledPlugins = await prisma.plugin.findMany({ where: { enabled: true }, select: { id: true } })
		return { enabledPlugins: enabledPlugins.map(p => p.id) }
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
