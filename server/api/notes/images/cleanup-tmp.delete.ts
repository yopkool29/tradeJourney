import { unlink, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'
import { getScreenshotUploadPath } from '~/server/utils/index'

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		const userId = Number(event.context.userId)
		const dbName = event.context.dbName

		if (!userId || !dbName) {
			throw createAppError({ statusCode: 401, message: 'User not authenticated or database not selected', tag: 'api.notes.images.cleanup_tmp.unauthorized' })
		}

		const uploadDir = resolve(process.cwd(), getScreenshotUploadPath(userId, dbName))
		const files = await readdir(uploadDir)
		const tmpFiles = files.filter(f => f.startsWith('tmp_nt_'))
		await Promise.all(tmpFiles.map(f => unlink(resolve(uploadDir, f))))
		return { deleted: tmpFiles.length }
	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({ statusCode: 500, message: 'Error cleaning up temporary images', tag: 'api.notes.images.cleanup_tmp.error', error })
	}
})
