import { readFile } from 'fs/promises'
import { join } from 'path'
import type { PrismaClient as DataPrismaClient } from '~/generated/prisma-data'

interface Migration {
    version: number
    name: string
    description: string
    file: string
    date: string
}

interface MigrationsManifest {
    migrations: Migration[]
}

/**
 * Get the max version from the migrations list
 */
export function getMaxVersion(manifest: MigrationsManifest): number {
    if (manifest.migrations.length === 0) return 0
    return Math.max(...manifest.migrations.map(m => m.version))
}

/**
 * Load the migrations manifest
 */
export async function loadMigrationsManifest(): Promise<MigrationsManifest> {
    const manifestPath = join(process.cwd(), 'scripts/migrations/migrations.json')
    const content = await readFile(manifestPath, 'utf-8')
    return JSON.parse(content)
}

/**
 * Get pending migrations for a schema
 */
function getPendingMigrations(
    currentVersion: number,
    manifest: MigrationsManifest
): Migration[] {
    return manifest.migrations
        .filter(m => m.version > currentVersion)
        .sort((a, b) => a.version - b.version)
}

/**
 * Apply a single migration to a schema
 */
async function applyMigration(
    dataDb: DataPrismaClient,
    schemaName: string,
    migration: Migration
): Promise<void> {
    const migrationPath = join(process.cwd(), 'scripts/migrations', migration.file)
    let sqlScript = await readFile(migrationPath, 'utf-8')

    // Replace placeholders (with and without quotes)
    sqlScript = sqlScript
        .replace(/"SCHEMA_PLACEHOLDER"/g, `"${schemaName}"`)
        .replace(/SCHEMA_PLACEHOLDER/g, schemaName)

    // Split SQL script into individual statements and execute them one by one
    // Remove comments and split by semicolons
    const statements = sqlScript
        .split('\n')
        .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
        .join('\n')
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.includes('CREATE SCHEMA'))

    // RESET ROLE to main user (owner) for ALTER TABLE permissions
    await dataDb.$executeRawUnsafe('RESET ROLE')

    try {
        for (const statement of statements) {
            if (statement.trim()) {
                await dataDb.$executeRawUnsafe(statement)
            }
        }
    } finally {
        // Restore the schema-specific role for isolation
        const roleName = schemaName.replace(/^user_/, 'role_user_')
        await dataDb.$executeRawUnsafe(`SET ROLE "${roleName}"`)
    }

    console.log(`✅ Applied migration ${migration.version}: ${migration.name} to schema ${schemaName}`)
}

/**
 * Apply all pending migrations to a schema
 */
export async function applyPendingMigrations(
    dataDb: DataPrismaClient,
    schemaName: string,
    currentVersion: number
): Promise<number> {
    const manifest = await loadMigrationsManifest()
    const pendingMigrations = getPendingMigrations(currentVersion, manifest)

    if (pendingMigrations.length === 0) {
        console.log(`✅ Schema ${schemaName} is up to date (version ${currentVersion})`)
        return currentVersion
    }

    console.log(`📦 Applying ${pendingMigrations.length} migration(s) to schema ${schemaName}...`)

    for (const migration of pendingMigrations) {
        await applyMigration(dataDb, schemaName, migration)
    }

    const newVersion = getMaxVersion(manifest)
    console.log(`✅ Schema ${schemaName} updated from version ${currentVersion} to ${newVersion}`)

    return newVersion
}

/**
 * Initialize a new schema with all migrations up to current version
 * This applies all migrations from version 0 to currentVersion
 */
export async function initializeSchemaWithMigrations(
    dataDb: DataPrismaClient,
    schemaName: string,
    roleName: string,
    mainUser: string
): Promise<number> {
    const manifest = await loadMigrationsManifest()

    console.log(`📦 Initializing schema ${schemaName} with ${manifest.migrations.length} migration(s)...`)

    // Apply all migrations in order (including version 0 - initial schema)
    for (const migration of manifest.migrations) {
        const migrationPath = join(process.cwd(), 'scripts/migrations', migration.file)
        let sqlScript = await readFile(migrationPath, 'utf-8')

        // Replace placeholders (with and without quotes)
        sqlScript = sqlScript
            .replace(/"SCHEMA_PLACEHOLDER"/g, `"${schemaName}"`)
            .replace(/SCHEMA_PLACEHOLDER/g, schemaName)
            .replace(/"ROLE_PLACEHOLDER"/g, `"${roleName}"`)
            .replace(/ROLE_PLACEHOLDER/g, roleName)
            .replace(/MAIN_USER_PLACEHOLDER/g, mainUser)

        // Split SQL script into individual statements and execute them one by one
        // Remove comments and split by semicolons
        const statements = sqlScript
            .split('\n')
            .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
            .join('\n')
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.includes('CREATE SCHEMA'))

        for (const statement of statements) {
            if (statement.trim()) {
                await dataDb.$executeRawUnsafe(statement)
            }
        }

        console.log(`✅ Applied migration ${migration.version}: ${migration.name}`)
    }

    const finalVersion = getMaxVersion(manifest)
    console.log(`✅ Schema ${schemaName} initialized at version ${finalVersion}`)

    return finalVersion
}
