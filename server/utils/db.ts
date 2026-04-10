import type { H3Event, EventHandlerRequest } from 'h3'
import { PrismaClient as AuthPrismaClient } from '~/generated/prisma-auth'
import { PrismaClient as DataPrismaClient } from '~/generated/prisma-data'
import { getUploadPath } from "./index"
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'

// Singleton instance for Auth database
let authDbInstance: AuthPrismaClient | null = null

export const buildShemaName = (userId: number, dbName: string): string => {
    const schema = `user_${userId}_db_${dbName}`
    if (!/^[a-zA-Z0-9_]+$/.test(schema)) {
        throw new Error(`Invalid schema name: ${schema}. Schema names must only contain alphanumeric characters and underscores.`)
    }
    return schema
}

export const buildRoleName = (userId: number, dbName: string): string => {
    const schemaName = buildShemaName(userId, dbName)
    return `role_${schemaName}`
}

export const getAuthDb = (): AuthPrismaClient => {
    if (!authDbInstance) {
        authDbInstance = new AuthPrismaClient()
    }
    return authDbInstance
}

// Cache for Data database connections per schema with timestamp
// Clients older than 1 hour are automatically recreated to avoid stale connections
const dataDbCache = new Map<string, { client: DataPrismaClient; createdAt: number }>()

export const getDataDb = async (userId: number, dbName: string): Promise<DataPrismaClient> => {
    // Construct schema name from userId and dbName
    const schemaName = buildShemaName(userId, dbName)

    const cached = dataDbCache.get(schemaName)

    if (cached) {
        // Invalidate clients older than 5 minutes to avoid stale connections
        const ageMs = Date.now() - cached.createdAt
        const maxAgeMs = 5 * 60 * 1000 // 5 minutes

        if (ageMs < maxAgeMs) {
            // console.log(`Using cached client for schema ${schemaName}`)
            // Re-execute SET ROLE on every call to handle connection pool recycling
            const roleName = buildRoleName(userId, dbName)
            await cached.client.$executeRawUnsafe(`SET ROLE "${roleName}"`)
            return cached.client
        }
        // Client is too old, disconnect and remove from cache
        cached.client.$disconnect().catch(() => { }) // Ignore errors
        dataDbCache.delete(schemaName)
    }

    // Get the base PostgreSQL URL
    const baseUrl = process.env.POSTGRES_URL_TEMPLATE
    if (!baseUrl) {
        throw new Error('POSTGRES_URL_TEMPLATE environment variable is not defined')
    }

    // Create URL with schema parameter
    const separator = baseUrl.includes('?') ? '&' : '?'
    const urlWithSchema = `${baseUrl}${separator}schema=${schemaName}`

    // Create new Prisma client with schema-specific datasource URL
    const client = new DataPrismaClient({
        datasources: {
            db: {
                url: urlWithSchema
            }
        }
    })

    // Set role for isolation - switch to the schema-specific NOLOGIN role
    const roleName = buildRoleName(userId, dbName)
    try {
        await client.$executeRawUnsafe(`SET ROLE "${roleName}"`)
    } catch (error) {
        console.error(`Failed to set role ${roleName}:`, error)
        throw new Error(`Failed to set database role ${roleName}. This is a security issue - schema isolation cannot be guaranteed.`)
    }

    // Cache the client with timestamp
    dataDbCache.set(schemaName, {
        client,
        createdAt: Date.now()
    })

    return client
}

// WARNING: This function should ONLY be used during schema creation
// It bypasses role-based isolation and should never be used for normal operations
export const getDataDbUnsafe = (userId: number, dbName: string): DataPrismaClient => {
    // Construct schema name from userId and dbName
    const schemaName = buildShemaName(userId, dbName)

    // Get the base PostgreSQL URL
    const baseUrl = process.env.POSTGRES_URL_TEMPLATE
    if (!baseUrl) {
        throw new Error('POSTGRES_URL_TEMPLATE environment variable is not defined')
    }

    // Create URL with schema parameter - this tells Prisma which schema to use
    const separator = baseUrl.includes('?') ? '&' : '?'
    const urlWithSchema = `${baseUrl}${separator}schema=${schemaName}`

    // Create new Prisma client with schema-specific datasource URL
    // Note: No role check, no caching for security reasons
    const client = new DataPrismaClient({
        datasources: {
            db: {
                url: urlWithSchema
            }
        }
    })

    return client
}

export const createUserDatabase = async (
    userId: number,
    dbName: string,
    displayName: string
) => {
    const authDb = getAuthDb()

    // Generate schema name: user_{userId}_db_{dbName}
    const schemaName = buildShemaName(userId, dbName)

    // Create upload folder structure
    const screenshotsFolder = getUploadPath(userId, dbName)

    if (!existsSync(screenshotsFolder)) {
        await mkdir(screenshotsFolder, { recursive: true })
    }

    // Create PostgreSQL schema using the SQL function
    let schemaExists = false
    try {
        await authDb.$executeRawUnsafe(
            `SELECT create_user_schema(${userId}, '${dbName}')`
        )
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            // En mode debug, le schéma peut déjà exister - on continue
            console.warn('Schema already exists, continuing...')
            schemaExists = true
        } else {
            console.error('Failed to create PostgreSQL schema:', error)
            throw new Error('Failed to create PostgreSQL schema')
        }
    }

    let migrationVersion = 0

    if (!schemaExists) {
        // Create NOLOGIN role for this schema
        const roleName = buildRoleName(userId, dbName)
        try {
            // Drop the role if it already exists (cleanup from previous failed attempts)
            try {
                await authDb.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`)
            } catch {
                // Ignore errors if role doesn't exist
            }

            // Create the role
            await authDb.$executeRawUnsafe(`CREATE ROLE "${roleName}" NOLOGIN`)

            // Grant usage and create on the schema
            await authDb.$executeRawUnsafe(`GRANT USAGE, CREATE ON SCHEMA "${schemaName}" TO "${roleName}"`)

            // Grant the role to the main PostgreSQL user so it can SET ROLE
            const mainUser = process.env.POSTGRES_USER || 'tradejourney'
            await authDb.$executeRawUnsafe(`GRANT "${roleName}" TO ${mainUser}`)

            // IMPORTANT: Revoke direct access from main user to enforce role-based isolation
            // The main user must use SET ROLE to access this schema
            await authDb.$executeRawUnsafe(`REVOKE ALL ON SCHEMA "${schemaName}" FROM ${mainUser}`)
        } catch (error) {
            console.error('Failed to create role:', error)
            // Rollback: drop the schema if role creation failed
            try {
                await authDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
            } catch (rollbackError) {
                console.error('Failed to rollback schema creation:', rollbackError)
            }
            throw new Error('Failed to create database role')
        }

        // Create tables in the new schema using the migration system
        try {
            // Get a data DB client for this schema (unsafe mode for creation)
            const dataDb = getDataDbUnsafe(userId, dbName)

            // Set search_path to the new schema
            await authDb.$executeRawUnsafe(`SET search_path TO "${schemaName}"`)

            // Initialize schema with all migrations
            const { initializeSchemaWithMigrations } = await import('./migrations')
            const mainUser = process.env.POSTGRES_USER!
            migrationVersion = await initializeSchemaWithMigrations(
                dataDb,
                schemaName,
                roleName,
                mainUser
            )

            // Reset search_path
            await authDb.$executeRawUnsafe(`SET search_path TO public`)
        } catch (error) {
            console.error('Failed to initialize schema tables:', error)
            // Rollback: drop the schema if table creation failed
            try {
                await authDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
            } catch (rollbackError) {
                console.error('Failed to rollback schema creation:', rollbackError)
            }
            throw new Error('Failed to initialize schema tables')
        }
    }
    else {
        // Get the migration version from the schema
        const { getMaxVersion, loadMigrationsManifest } = await import('./migrations')
        const manifest = await loadMigrationsManifest()
        migrationVersion = getMaxVersion(manifest)
    }

    // Create database record in auth DB with migration version
    const database = await authDb.database.create({
        data: {
            userId,
            name: dbName,
            displayName,
            schemaName,
            isDefault: false,
            migrationVersion
        }
    })

    return database
}


export const validateSchemaExists = async (userId: number, dbName: string): Promise<void> => {
    const authDb = getAuthDb()

    // Validate schema name format
    buildShemaName(userId, dbName)

    // Check if the database exists in the auth database
    const database = await authDb.database.findFirst({
        where: {
            userId: userId,
            name: dbName
        }
    })

    if (!database) {
        throw createAppError({
            statusCode: 404,
            message: 'Database not found',
            tag: 'api.backup.download.no_database'
        })
    }
}

export const getPrisma = async (event: H3Event<EventHandlerRequest>): Promise<DataPrismaClient> => {
    const userId = Number(event.context.userId)
    const dbName = event.context.dbName as string

    if (!userId || !dbName) {
        throw new Error('User ID or database name not found in context. Make sure auth middleware is applied and database is selected.')
    }

    return await getDataDb(userId, dbName)
}

// export const closeAllConnections = async () => {
//     if (authDbInstance) {
//         await authDbInstance.$disconnect()
//         authDbInstance = null
//     }

//     // Disconnect all cached data clients
//     for (const [_schemaName, client] of dataDbCache.entries()) {
//         await client.$disconnect()
//     }
//     dataDbCache.clear()
// }
