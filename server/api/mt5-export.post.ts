import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getAuthDb } from '~/server/utils/db'
import { createAppError } from '~/server/utils/errors'

export const config = {
    api: {
        bodyParser: false,
    },
}

export default defineEventHandler(async (event) => {
    try {
        // Get the token from headers
        const token = getHeader(event, 'x-api-token')
        if (!token) {
            throw createAppError({
                statusCode: 401,
                message: 'API token required',
                tag: 'api.mt5_export.missing_token'
            })
        }

        // Verify token and get user
        const prisma = getAuthDb()
        const user = await prisma.user.findUnique({
            where: {
                token
            }
        })

        if (!user) {
            throw createAppError({
                statusCode: 401,
                message: 'Invalid API token',
                tag: 'api.mt5_export.invalid_token'
            })
        }

        // Parse multipart form data
        const form = await readMultipartFormData(event)
        if (!form) {
            throw createAppError({
                statusCode: 400,
                message: 'No file provided',
                tag: 'api.mt5_export.no_file'
            })
        }

        // Find the file field
        const fileField = form.find(f => f.name === 'file')
        if (!fileField || !fileField.data) {
            throw createAppError({
                statusCode: 400,
                message: 'No file field found',
                tag: 'api.mt5_export.no_file_field'
            })
        }

        // Get filename from form data or generate one
        const filenameField = form.find(f => f.name === 'filename')
        const filename = filenameField?.data?.toString() || `mt5-export-${Date.now()}.csv`

        // Validate filename (prevent directory traversal)
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid filename',
                tag: 'api.mt5_export.invalid_filename'
            })
        }

        // Create user import directory
        const importDir = join(process.cwd(), `temp/imports/user_${user.id}`)
        await mkdir(importDir, { recursive: true })

        // Save file
        const filePath = join(importDir, filename)
        await writeFile(filePath, fileField.data)

        return {
            success: true,
            message: 'File uploaded successfully',
            userId: user.id,
            filename,
            path: filePath
        }
    } catch (error) {
        console.error('MT5 export upload error:', error)
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw err
        }
        throw createAppError({
            statusCode: 500,
            message: 'Failed to upload file',
            tag: 'api.mt5_export.upload_error',
            error
        })
    }
})
