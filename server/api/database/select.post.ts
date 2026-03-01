/**
 * Select a database for the current session
 */
import { getAuthDb } from '../../utils/db'
import { createAppError } from '../../utils/errors'
import jwt from 'jsonwebtoken'
import auth from '../../utils/auth'
import { setCookie } from 'h3'

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

        const { databaseId } = await readBody(event)

        if (!databaseId) {
            throw createAppError({
                statusCode: 400,
                message: 'Database ID is required',
                tag: 'api.database.select.missing_id'
            })
        }

        // Verify database belongs to user
        const authDb = getAuthDb()
        const database = await authDb.database.findFirst({
            where: {
                id: databaseId,
                userId: parseInt(userId)
            }
        })

        if (!database) {
            throw createAppError({
                statusCode: 404,
                message: 'Database not found',
                tag: 'api.database.common.not_found'
            })
        }

        // Check and apply pending migrations for this database
        const { ensureMigrationsApplied } = await import('../../utils/check-migrations')
        await ensureMigrationsApplied(event, parseInt(userId), database.name)

        // Generate new JWT with database info
        const token = jwt.sign(
            {
                userId: parseInt(userId),
                databaseId: database.id,
                dbName: database.name
            },
            process.env.JWT_SECRET || 'devsecret',
            { expiresIn: '7d' }
        )

        // Update cookie
        setCookie(event, 'token', token, {
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        })

        return {
            id: database.id,
            name: database.name,
            displayName: database.displayName,
            isDefault: database.isDefault
        }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Failed to select database',
            tag: 'api.database.common.server_error',
            error
        })
    }
})
