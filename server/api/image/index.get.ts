import { createReadStream } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { stat } from 'node:fs/promises'
import { createAppError } from '../../utils/errors'


export default defineEventHandler(async (event) => {
    const { path: imagePath } = getQuery(event)

    if (!imagePath || typeof imagePath !== 'string') {
        throw createAppError({
            statusCode: 400,
            message: 'URL is required',
            tag: 'api.image.get.missing_url'
        })
    }

    try {

        const __dirname = dirname(fileURLToPath(import.meta.url))
        const publicDir = resolve(__dirname, '../../upload/screenshots')
        const filePath = resolve(publicDir, imagePath.startsWith('/') ? imagePath.slice(1) :
            imagePath)

        const stats = await stat(filePath)
        if (!stats.isFile()) {
            throw createAppError({
                statusCode: 404,
                message: 'File not found',
                tag: 'api.image.get.file_not_found'
            })
        }
        // Déterminer le type MIME
        const mimeType = getMimeType(filePath)
        const stream = createReadStream(filePath)
        setResponseHeader(event, 'Content-Type', mimeType)
        setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000')

        return sendStream(event, stream)

    } catch {
        // console.error('Image proxy error:', error)
        throw createAppError({
            statusCode: 500,
            message: 'Failed to fetch image',
            tag: 'api.image.get.fetch_error'
        })
    }
})


// Fonction utilitaire pour déterminer le type MIME
function getMimeType(filePath: string): string {
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