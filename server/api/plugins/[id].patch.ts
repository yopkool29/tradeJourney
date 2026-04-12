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
		const pluginId = getRouterParam(event, 'id')
		const body = await readBody<{ enabled: boolean }>(event)

		if (!pluginId) {
			throw createAppError({ statusCode: 400, message: 'Plugin ID is required', tag: 'api.plugins.toggle.missing_id' })
		}

		const user = await prisma.user.findUnique({
			where: { id: Number(userId) },
			select: { settings: true },
		})

		const settings = JSON.parse(user?.settings || '{}')
		const enabledPlugins: string[] = settings.enabledPlugins ?? []

		const updated = body.enabled
			? [...new Set([...enabledPlugins, pluginId])]
			: enabledPlugins.filter((id: string) => id !== pluginId)

		settings.enabledPlugins = updated

		await prisma.user.update({
			where: { id: Number(userId) },
			data: { settings: JSON.stringify(settings) },
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
