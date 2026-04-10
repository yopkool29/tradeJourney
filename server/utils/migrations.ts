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

export const getMaxVersion = (manifest: MigrationsManifest): number => {
    if (manifest.migrations.length === 0) return 0
    return Math.max(...manifest.migrations.map(m => m.version))
}

export const loadMigrationsManifest = async (): Promise<MigrationsManifest> => {
    const manifestPath = join(process.cwd(), 'scripts/migrations/migrations.json')
    const content = await readFile(manifestPath, 'utf-8')
    return JSON.parse(content)
}

const getPendingMigrations = (
    currentVersion: number,
    manifest: MigrationsManifest
): Migration[] => {
    return manifest.migrations
        .filter(m => m.version > currentVersion)
        .sort((a, b) => a.version - b.version)
}

const applyMigration = async (
    dataDb: DataPrismaClient,
    schemaName: string,
    migration: Migration
): Promise<void> => {
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

export const applyPendingMigrations = async (
    dataDb: DataPrismaClient,
    schemaName: string,
    currentVersion: number
): Promise<number> => {
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

export const initializeSchemaWithMigrations = async (
    dataDb: DataPrismaClient,
    schemaName: string,
    roleName: string,
    mainUser: string
): Promise<number> => {
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
