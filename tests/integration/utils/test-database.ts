import type { Database } from '~/composables/useDatabase'
import {
	checkServerRunning,
	loginTestUser,
	cleanupOldTestDatabases,
	updateSessionCookie,
	deleteTestDatabase,
	generateTestDbName,
	BASE_URL
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
			const list = await $fetch(`${BASE_URL}/api/database/list`) as Array<{ id: number; migrationVersion: number }>
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

	const { createDatabase } = useDatabase()
	const dbName = generateTestDbName()
	const result = await createDatabase(dbName, `Test DB ${dbName}`) as Database

	const selectResp = await $fetch.raw(`${BASE_URL}/api/database/select`, {
		method: 'POST',
		body: { databaseId: result.id }
	})
	const newCookie = selectResp.headers.get('set-cookie')
	if (newCookie) {
		updateSessionCookie(newCookie.split(';')[0])
	}

	// Wait for schema to be ready via polling instead of fixed sleep
	await waitForDatabaseSchemaReady()

	// Initialize tag groups (needed by most composables)
	const { fetchGroups } = useTags()
	await fetchGroups()

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

