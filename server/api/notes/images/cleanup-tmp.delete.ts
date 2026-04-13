import { unlink, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'
import { getScreenshotUploadPath } from '~/server/utils/index'

export default defineEventHandler(async (event) => {
	await auth(event)

	const userId = Number(event.context.userId)
	const dbName = event.context.dbName

	if (!userId || !dbName) {
		throw createAppError({ statusCode: 401, message: 'User not authenticated or database not selected', tag: 'api.notes.images.cleanup_tmp.unauthorized' })
	}

	const uploadDir = resolve(process.cwd(), getScreenshotUploadPath(userId, dbName))

	try {
		const files = await readdir(uploadDir)
		const tmpFiles = files.filter(f => f.startsWith('tmp_nt_'))
		await Promise.all(tmpFiles.map(f => unlink(resolve(uploadDir, f))))
		return { deleted: tmpFiles.length }
	} catch {
		return { deleted: 0 }
	}
})
