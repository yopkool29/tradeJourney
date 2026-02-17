/**
 * Delete a database with password verification
 */
import bcrypt from 'bcryptjs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { getAuthDb, buildShemaName, buildRoleName } from '../../utils/db'
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
                tag: 'api.database.delete.unauthorized'
            })
        }

        const { databaseId, password } = await readBody(event)

        if (!databaseId || !password) {
            throw createAppError({
                statusCode: 400,
                message: 'Database ID and password are required',
                tag: 'api.database.delete.missing_params'
            })
        }

        // Get auth database
        const authDb = getAuthDb()

        // Verify database belongs to user
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
                tag: 'api.database.delete.not_found'
            })
        }

        // Verify user password
        const user = await authDb.user.findUnique({
            where: {
                id: parseInt(userId)
            }
        })

        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw createAppError({
                statusCode: 401,
                message: 'Invalid password',
                tag: 'api.database.delete.invalid_password'
            })
        }

        // Delete the schema and role from PostgreSQL
        const schemaName = buildShemaName(parseInt(userId), database.name)
        const roleName = buildRoleName(parseInt(userId), database.name)

        const authDbConnection = getAuthDb()
        
        try {
            // Drop schema with cascade (this will also drop all tables)
            await authDbConnection.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
            
            // Drop the role
            await authDbConnection.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`)
        } catch (error) {
            console.error('Failed to drop schema/role:', error)
            throw createAppError({
                statusCode: 500,
                message: 'Failed to delete database schema',
                tag: 'api.database.delete.schema_error',
                error
            })
        }

        // Delete database record from auth database
        await authDb.database.delete({
            where: {
                id: databaseId
            }
        })

        // Delete upload directory for this database
        // Remove the entire database folder: ./upload/user_{userId}_data/{dbName}
        const uploadPath = join(process.cwd(), 'upload', `user_${userId}_data`, database.name)
        if (existsSync(uploadPath)) {
            try {
                await rm(uploadPath, { recursive: true, force: true })
                console.log(`Deleted upload directory: ${uploadPath}`)
            } catch (error) {
                console.error('Failed to delete upload directory:', error)
                // Don't throw error - database is already deleted
            }
        }

        // Delete backup/export directory for this database
        // Remove: ./temp/exports/user_{userId}/db_{dbName}
        const exportPath = join(process.cwd(), 'temp', 'exports', `user_${userId}`, `db_${database.name}`)
        if (existsSync(exportPath)) {
            try {
                await rm(exportPath, { recursive: true, force: true })
                console.log(`Deleted export directory: ${exportPath}`)
            } catch (error) {
                console.error('Failed to delete export directory:', error)
                // Don't throw error - database is already deleted
            }
        }

        return {
            success: true,
            message: 'Database deleted successfully'
        }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Failed to delete database',
            tag: 'api.database.delete.server_error',
            error
        })
    }
})
