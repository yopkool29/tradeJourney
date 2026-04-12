import { readFile } from 'fs/promises'
import { join } from 'path'
import { createAppError } from '~/server/utils/errors'
import auth from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await auth(event)
	const userId = event.context.userId
	if (!userId) {
		throw createAppError({ statusCode: 401, message: 'Unauthorized', tag: 'api.plugins.file.unauthorized' })
	}

	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createAppError({ statusCode: 400, message: 'Plugin ID required', tag: 'api.plugins.file.missing_id' })
		}

		// Security: prevent directory traversal
		if (id.includes('..') || id.includes('/')) {
			throw createAppError({ statusCode: 400, message: 'Invalid plugin ID', tag: 'api.plugins.file.invalid_id' })
		}

		const filePath = join(process.cwd(), 'plugins-prod', id, 'plugin.umd.cjs')
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
			statusCode: 404,
			message: 'Plugin file not found',
			tag: 'api.plugins.file.not_found',
			error
		})
	}
})
