import auth from '~/server/utils/auth'
import { getAuthDb } from '~/server/utils/db'
import { createAppError } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const userId = Number(event.context.userId)
        const databaseId = Number(getRouterParam(event, 'id'))

        if (!databaseId || isNaN(databaseId)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid database ID',
                tag: 'api.database.rename.invalid_id'
            })
        }

        const body = await readBody(event)
        const { displayName } = body

        if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
            throw createAppError({
                statusCode: 400,
                message: 'Display name is required',
                tag: 'api.database.rename.invalid_display_name'
            })
        }

        const authDb = await getAuthDb()

        const database = await authDb.database.findFirst({
            where: {
                id: databaseId,
                userId: userId,
            },
        })

        if (!database) {
            throw createAppError({
                statusCode: 404,
                message: 'Database not found',
                tag: 'api.database.rename.not_found'
            })
        }

        const updatedDatabase = await authDb.database.update({
            where: { id: databaseId },
            data: { displayName: displayName.trim() },
        })

        return {
            success: true,
            database: {
                id: updatedDatabase.id,
                name: updatedDatabase.name,
                displayName: updatedDatabase.displayName,
            },
        }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Failed to rename database',
            tag: 'api.database.rename.error',
            error
        })
    }
})
