import { createReadStream } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { stat } from 'node:fs/promises'
import { createAppError } from '../../utils/errors'
import { getScreenshotUploadPath } from '../../utils/index'
import auth from '../../utils/auth'


export default defineEventHandler(async (event) => {
    try {
        const { path: imagePath } = getQuery(event)

        if (!imagePath || typeof imagePath !== 'string') {
            throw createAppError({
                statusCode: 400,
                message: 'URL is required',
                tag: 'api.image.get.missing_url'
            })
        }

        const __dirname = dirname(fileURLToPath(import.meta.url))
        const uploadDir = resolve(__dirname, '../../upload')
        
        let filePath: string
        
        // Si le path contient un slash, c'est le format complet avec le chemin
        if (imagePath.includes('/')) {
            filePath = resolve(uploadDir, imagePath.startsWith('/') ? imagePath.slice(1) : imagePath)
        } else {
            // Format filename-only : utiliser le contexte utilisateur
            await auth(event)
            const userId = Number(event.context.userId)
            const dbName = event.context.dbName
            
            if (!userId || !dbName) {
                throw createAppError({
                    statusCode: 401,
                    message: 'User not authenticated or database not selected',
                    tag: 'api.image.get.unauthorized'
                })
            }
            
            const screenshotPath = getScreenshotUploadPath(userId, dbName)
            filePath = resolve(__dirname, '../../', screenshotPath, imagePath)
        }

        const stats = await stat(filePath)
        if (!stats.isFile()) {
            throw createAppError({
                statusCode: 404,
                message: 'File not found',
                tag: 'api.image.get.file_not_found'
            })
        }

        const mimeType = getMimeType(filePath)
        const stream = createReadStream(filePath)
        setResponseHeader(event, 'Content-Type', mimeType)
        const cacheControl = 'public, max-age=31536000'
        setResponseHeader(event, 'Cache-Control', cacheControl)

        return sendStream(event, stream)
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Failed to fetch image',
            tag: 'api.image.get.fetch_error',
            error
        })
    }
})


const getMimeType = (filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml'
    }
    return mimeTypes[extension as keyof typeof mimeTypes] || 'application/octet-stream'
}