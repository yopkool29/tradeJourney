import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'
import { getScreenshotUploadPath } from '~/server/utils/index'
import { createRateLimiter } from '~/server/utils/rateLimiter'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

// Rate limiter: 10 uploads per minute per user
const uploadRateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 6 })

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		const userId = Number(event.context.userId)
		const dbName = event.context.dbName

		// Check rate limit
		const rateLimit = uploadRateLimiter.check(userId)
		
		if (!rateLimit.allowed) {
			throw createAppError({
				statusCode: 429,
				message: 'Too many uploads. Please wait a moment.',
				tag: 'api.notes.images.upload.rate_limited'
			})
		}

		if (!userId || !dbName) {
			throw createAppError({ statusCode: 401, message: 'User not authenticated or database not selected', tag: 'api.notes.images.upload.unauthorized' })
		}

		const formData = await readMultipartFormData(event)
		if (!formData || formData.length === 0) {
			throw createAppError({ statusCode: 400, message: 'No file uploaded', tag: 'api.notes.images.upload.no_file' })
		}

		const filePart = formData.find(part => part.name === 'image')
		if (!filePart || !filePart.data) {
			throw createAppError({ statusCode: 400, message: 'Missing image field', tag: 'api.notes.images.upload.missing_field' })
		}

		if (filePart.data.length > MAX_FILE_SIZE) {
			throw createAppError({ statusCode: 400, message: 'File too large (max 5MB)', tag: 'api.notes.images.upload.too_large' })
		}

		const originalName = filePart.filename || 'image.png'
		const ext = extname(originalName).toLowerCase()
		if (!ALLOWED_EXTENSIONS.includes(ext)) {
			throw createAppError({ statusCode: 400, message: 'Invalid file type', tag: 'api.notes.images.upload.invalid_type' })
		}

		const filename = `tmp_nt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
		const uploadDir = resolve(process.cwd(), getScreenshotUploadPath(userId, dbName))
		await mkdir(uploadDir, { recursive: true })
		await writeFile(resolve(uploadDir, filename), filePart.data)

		const url = `/api/image?path=screenshots/${filename}`

		return { filename, url }
	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({ statusCode: 500, message: 'Error uploading image', tag: 'api.notes.images.upload.error', error })
	}
})
