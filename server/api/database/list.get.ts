/**
 * Get list of databases for the authenticated user
 */
import { getAuthDb } from '../../utils/db'
import { createAppError } from '../../utils/errors'
import auth from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const userId = event.context.userId
        
        if (!userId) {
            throw createAppError({
                statusCode: 401,
                message: 'Unauthorized',
                tag: 'api.database.list.unauthorized'
            })
        }

        const authDb = getAuthDb()
        const databases = await authDb.database.findMany({
            where: { userId: parseInt(userId) },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'asc' }
            ]
        })

        return databases.map(db => ({
            id: db.id,
            name: db.name,
            displayName: db.displayName,
            isDefault: db.isDefault,
            createdAt: db.createdAt
        }))
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Failed to fetch databases',
            tag: 'api.database.list.server_error',
            error
        })
    }
})
