import { unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'
import { getScreenshotUploadPath } from '~/server/utils/index'

export default defineEventHandler(async (event) => {
	await auth(event)

	const userId = Number(event.context.userId)
	const dbName = event.context.dbName

	if (!userId || !dbName) {
		throw createAppError({ statusCode: 401, message: 'User not authenticated or database not selected', tag: 'api.notes.images.delete.unauthorized' })
	}

	const filename = getRouterParam(event, 'filename')
	if (!filename || (!filename.startsWith('nt_') && !filename.startsWith('tmp_nt_'))) {
		throw createAppError({ statusCode: 400, message: 'Invalid filename', tag: 'api.notes.images.delete.invalid_filename' })
	}

	const uploadDir = resolve(process.cwd(), getScreenshotUploadPath(userId, dbName))
	const filePath = resolve(uploadDir, filename)

	if (!filePath.startsWith(uploadDir + '/') && filePath !== uploadDir) {
		throw createAppError({ statusCode: 400, message: 'Invalid path', tag: 'api.notes.images.delete.invalid_path' })
	}

	console.log(`[notes/images/delete] filePath: ${filePath}, exists: ${existsSync(filePath)}`)
	if (existsSync(filePath)) {
		await unlink(filePath)
		console.log(`[notes/images/delete] deleted: ${filePath}`)
	}

	return { success: true }
})
