import { getAuthDb } from '~/server/utils/db'
import { createAppError } from '~/server/utils/errors'
import auth from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = getAuthDb()
        const userId = parseInt(event.context.userId)
        const fileId = getRouterParam(event, 'fileId')

        if (!fileId) {
            throw createAppError({
                statusCode: 400,
                message: 'File ID required',
                tag: 'api.storage.delete.missing_file_id'
            })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                token: true,
                settings: true
            }
        })

        if (!user) {
            throw createAppError({
                statusCode: 401,
                message: 'User not found',
                tag: 'api.storage.delete.user_not_found'
            })
        }

        const settings = JSON.parse(user.settings || '{}')
        const storageUrl = settings.storageUrl

        if (!storageUrl || !user.token) {
            throw createAppError({
                statusCode: 400,
                message: 'Storage URL or token not configured',
                tag: 'api.storage.delete.not_configured'
            })
        }

        // Proxy request to storage server
        await $fetch(`${storageUrl}/api/upload/delete/${fileId}`, {
            method: 'DELETE',
            headers: {
                'X-API-Token': user.token
            }
        })

        return { success: true }
    } catch (error) {
        console.error('Storage delete error:', error)
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }
        throw createAppError({
            statusCode: 500,
            message: 'Failed to delete file from storage server',
            tag: 'api.storage.delete.server_error',
            error
        })
    }
})
