/**
 * Create a new database for the authenticated user
 */
import { createUserDatabase } from '../../utils/db'
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
                tag: 'api.database.common.unauthorized'
            })
        }

        const { name, displayName } = await readBody(event)

        // Validation
        if (!name || !displayName) {
            throw createAppError({
                statusCode: 400,
                message: 'Name and displayName are required',
                tag: 'api.database.create.missing_fields'
            })
        }

        // Validate name format (alphanumeric and underscores only)
        if (!/^[a-z0-9_]+$/.test(name)) {
            throw createAppError({
                statusCode: 400,
                message: 'Name must contain only lowercase letters, numbers, and underscores',
                tag: 'api.database.create.invalid_name'
            })
        }

        // Check if database name already exists for this user
        const { getAuthDb } = await import('../../utils/db')
        const authDb = getAuthDb()
        const existingDb = await authDb.database.findFirst({
            where: {
                userId: parseInt(userId),
                name: name
            }
        })

        if (existingDb) {
            throw createAppError({
                statusCode: 409,
                message: 'A database with this name already exists',
                tag: 'api.database.create.duplicate_name'
            })
        }

        const database = await createUserDatabase(
            parseInt(userId),
            name,
            displayName
        )

        return {
            id: database.id,
            name: database.name,
            displayName: database.displayName,
            isDefault: database.isDefault,
            createdAt: database.createdAt
        }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Failed to create database',
            tag: 'api.database.common.server_error',
            error
        })
    }
})
