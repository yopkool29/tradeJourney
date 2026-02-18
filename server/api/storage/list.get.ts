import { getAuthDb } from '~/server/utils/db'
import { createAppError } from '~/server/utils/errors'
import auth from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = getAuthDb()
        const userId = parseInt(event.context.userId)

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
                tag: 'api.storage.list.user_not_found'
            })
        }

        const settings = JSON.parse(user.settings || '{}')
        const storageUrl = settings.storageUrl

        if (!storageUrl || !user.token) {
            throw createAppError({
                statusCode: 400,
                message: 'Storage URL or token not configured',
                tag: 'api.storage.list.not_configured'
            })
        }

        // Proxy request to storage server
        const response = await $fetch<{ count: number; files: any[] }>(`${storageUrl}/api/upload/list`, {
            method: 'GET',
            headers: {
                'X-API-Token': user.token
            }
        })

        return response
    } catch (error) {
        console.error('Storage list error:', error)
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }
        throw createAppError({
            statusCode: 500,
            message: 'Failed to list files from storage server',
            tag: 'api.storage.list.server_error',
            error
        })
    }
})
