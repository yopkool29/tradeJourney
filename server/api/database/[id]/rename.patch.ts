import auth from '~/server/utils/auth'
import { getAuthDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
    // Authenticate user
    await auth(event)

    const userId = Number(event.context.userId)
    const databaseId = Number(getRouterParam(event, 'id'))

    if (!databaseId || isNaN(databaseId)) {
        throw createError({
            statusCode: 400,
            message: 'Invalid database ID',
        })
    }

    const body = await readBody(event)
    const { displayName } = body

    if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
        throw createError({
            statusCode: 400,
            message: 'Display name is required',
        })
    }

    try {
        const authDb = await getAuthDb()

        // Verify that the database belongs to the user
        const database = await authDb.database.findFirst({
            where: {
                id: databaseId,
                userId: userId,
            },
        })

        if (!database) {
            throw createError({
                statusCode: 404,
                message: 'Database not found',
            })
        }

        // Update the display name
        const updatedDatabase = await authDb.database.update({
            where: {
                id: databaseId,
            },
            data: {
                displayName: displayName.trim(),
            },
        })

        return {
            success: true,
            database: {
                id: updatedDatabase.id,
                name: updatedDatabase.name,
                displayName: updatedDatabase.displayName,
            },
        }
    } catch (error: any) {
        console.error('Database rename error:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            message: error.message || 'Failed to rename database',
        })
    }
})
