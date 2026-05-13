import { rename } from 'node:fs/promises'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'
import { getScreenshotUploadPath } from '~/server/utils/index'

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		const userId = Number(event.context.userId)
		const dbName = event.context.dbName

		if (!userId || !dbName) {
			throw createAppError({ statusCode: 401, message: 'User not authenticated or database not selected', tag: 'api.notes.images.finalize.unauthorized' })
		}

		const body = await readBody(event) as { noteId: number; content: string }
		if (!body.noteId || !body.content) {
			throw createAppError({ statusCode: 400, message: 'Missing noteId or content', tag: 'api.notes.images.finalize.missing_params' })
		}

		const uploadDir = resolve(process.cwd(), getScreenshotUploadPath(userId, dbName))
		const tmpRegex = /tmp_nt_[^/&\s)]+/g
		const tmpFiles = [...new Set(body.content.match(tmpRegex) ?? [])]

		let updatedContent = body.content
		for (const tmpName of tmpFiles) {
			const suffix = tmpName.replace('tmp_nt_', '')
			const finalName = `nt_${body.noteId}_${suffix}`
			const tmpPath = resolve(uploadDir, tmpName)
			const finalPath = resolve(uploadDir, finalName)

			if (existsSync(tmpPath)) {
				await rename(tmpPath, finalPath)
			}

			// Utiliser le format filename-only pour la portabilité
			const finalUrl = `/api/image?path=${finalName}`
			const tmpUrl = `/api/image?path=${tmpName}`
			
			// Remplacer aussi l'ancien format avec path complet (pour compatibilité)
			const screenshotPath = getScreenshotUploadPath(userId, dbName).replace('./upload/', '')
			const oldFormatTmpUrl = `/api/image?path=${screenshotPath}/${tmpName}`
			const oldFormatFinalUrl = `/api/image?path=${screenshotPath}/${finalName}`
			
			updatedContent = updatedContent.replaceAll(tmpUrl, finalUrl)
			updatedContent = updatedContent.replaceAll(oldFormatTmpUrl, finalUrl)
			updatedContent = updatedContent.replaceAll(oldFormatFinalUrl, finalUrl)
		}

		return { content: updatedContent }
	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({ statusCode: 500, message: 'Error finalizing images', tag: 'api.notes.images.finalize.error', error })
	}
})
