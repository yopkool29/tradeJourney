import type { Database } from '~/composables/data/useDatabase'
import {
	checkServerRunning,
	loginTestUser,
	cleanupOldTestDatabases,
	deleteTestDatabase,
	generateTestDbName
} from './test-helpers'

/**
 * Load the target migration version from the migrations manifest.
 */
const getTargetMigrationVersion = async () => {
	const fs = await import('node:fs/promises')
	const path = await import('node:path')
	const manifestPath = path.join(process.cwd(), 'scripts/migrations/migrations.json')
	const content = await fs.readFile(manifestPath, 'utf-8')
	const manifest = JSON.parse(content) as { migrations: Array<{ version: number }> }
	return Math.max(...manifest.migrations.map(m => m.version))
}

/**
 * Polls the server until the database schema is fully migrated.
 * Waits until migrationVersion matches the target version from migrations.json.
 */
const waitForDatabaseSchemaReady = async () => {
	const targetVersion = await getTargetMigrationVersion()
	const start = Date.now()
	const maxWait = 15000
	const interval = 500

	while (Date.now() - start < maxWait) {
		try {
			// @ts-expect-error global $fetch is stubbed in setup.ts
			const list = await $fetch('/api/database/list') as Array<{ id: number; migrationVersion: number }>
			const db = list.find(d => d.migrationVersion === targetVersion)
			if (db) {
				console.log(`[test-database] Schema ready after ${Date.now() - start}ms (migrationVersion=${db.migrationVersion}/${targetVersion})`)
				return
			}
		} catch {
			// ignore — server might still be initialising
		}
		await new Promise(r => setTimeout(r, interval))
	}

	throw new Error(`Database schema not ready after ${maxWait}ms (target=${targetVersion})`)
}

/**
 * Creates a fresh test database for the calling test file.
 * Each call creates a brand new independent database.
 */
export const acquireTestDatabase = async () => {
	await checkServerRunning()
	const loginResult = await loginTestUser()
	const userStore = useUserStore()
	userStore.setUser(loginResult)
	await cleanupOldTestDatabases()

	const dbName = generateTestDbName()
	// @ts-expect-error global $fetch is stubbed in setup.ts
	const result = await $fetch('/api/database/create', {
		method: 'POST',
		body: { name: dbName, displayName: `Test DB ${dbName}` }
	}) as Database

	// @ts-expect-error global $fetch is stubbed in setup.ts
	await $fetch.raw('/api/database/select', {
		method: 'POST',
		body: { databaseId: result.id }
	})

	// Wait for schema to be ready via polling instead of fixed sleep
	await waitForDatabaseSchemaReady()

	// Initialize tag groups (needed by most composables)
	// @ts-expect-error global $fetch is stubbed in setup.ts
	await $fetch('/api/tags')

	console.log(`[test-database] Created fresh test database: ${result.id}`)
	return { id: result.id, name: result.name }
}

/**
 * Deletes the test database created by acquireTestDatabase.
 */
export const releaseTestDatabase = async (dbId: number) => {
	await deleteTestDatabase(dbId)
	console.log(`[test-database] Deleted test database: ${dbId}`)
}

