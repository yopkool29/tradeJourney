/**
 * Utility to check and apply pending migrations for a schema
 */
import { getAuthDb, getDataDb } from './db'
import { applyPendingMigrations, loadMigrationsManifest, getMaxVersion } from './migrations'
import type { PrismaClient as DataPrismaClient } from '~/generated/prisma-data'
import type { H3Event, EventHandlerRequest } from 'h3'

// Cache to track which schemas have been checked in this session
const checkedSchemas = new Set<string>()

/**
 * Check if a schema needs migrations and apply them if necessary
 * This should be called when connecting to an existing schema
 */
export async function checkAndApplyMigrations(
    dataDb: DataPrismaClient,
    userId: number,
    dbName: string
): Promise<void> {
    const authDb = getAuthDb()

    // Get the database record from auth DB
    const database = await authDb.database.findFirst({
        where: {
            userId,
            name: dbName
        }
    })

    if (!database) {
        throw new Error(`Database ${dbName} not found for user ${userId}`)
    }

    // Load current migration version from manifest
    const manifest = await loadMigrationsManifest()
    const currentVersion = getMaxVersion(manifest)

    // Check if migrations are needed
    if (database.migrationVersion < currentVersion) {
        console.log(`🔄 Schema ${database.schemaName} needs migration from v${database.migrationVersion} to v${currentVersion}`)

        // Apply pending migrations
        const newVersion = await applyPendingMigrations(
            dataDb,
            database.schemaName,
            database.migrationVersion
        )

        // Update the migration version in auth DB
        await authDb.database.update({
            where: { id: database.id },
            data: { migrationVersion: newVersion }
        })

        console.log(`✅ Schema ${database.schemaName} successfully migrated to v${newVersion}`)
    } else {
        console.log(`✅ Schema ${database.schemaName} is up to date (v${database.migrationVersion})`)
    }
}


/**
 * Ensure migrations are applied for a user's database
 * This should be called at the beginning of API endpoints that use the data DB
 * 
 * @param event - H3 event
 * @param userId - User ID
 * @param dbName - Database name
 * @returns DataPrismaClient instance
 */
export async function ensureMigrationsApplied(
    event: H3Event<EventHandlerRequest>,
    userId: number,
    dbName: string
) {
    const schemaKey = `${userId}_${dbName}`
    
    // Get the data DB client
    const dataDb = await getDataDb(userId, dbName)
    
    // Only check migrations once per schema per server session
    // This avoids checking on every request
    if (!checkedSchemas.has(schemaKey)) {
        try {
            await checkAndApplyMigrations(dataDb, userId, dbName)
            checkedSchemas.add(schemaKey)
        } catch (error) {
            console.error(`Failed to apply migrations for schema ${schemaKey}:`, error)
            throw error
        }
    }
    
    return dataDb
}

/**
 * Clear the migration check cache (useful for testing or manual migration triggers)
 */
export function clearMigrationCache(userId?: number, dbName?: string) {
    if (userId && dbName) {
        const schemaKey = `${userId}_${dbName}`
        checkedSchemas.delete(schemaKey)
    } else {
        checkedSchemas.clear()
    }
}
