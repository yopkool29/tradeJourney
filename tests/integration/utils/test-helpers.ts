// Test configuration
export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword'
export const TEST_DB_NAME_PREFIX = 'integration_test_'
export const BASE_URL = process.env.TEST_BASE_URL || `http://localhost:${process.env.EXTERNAL_PORT || 3000}`

export const checkServerRunning = async () => {
	try {
		// @ts-expect-error global $fetch is stubbed in setup.ts
		await $fetch('/api/auth', { ignoreResponseError: true })
		console.log('Server is running at', BASE_URL)
		return true
	} catch {
		throw new Error(
			`Nuxt server is not running at ${BASE_URL}! Please start it first with 'npm run dev' in another terminal.`
		)
	}
}

export const loginTestUser = async () => {
	try {
		// @ts-expect-error global $fetch is stubbed in setup.ts
		const loginResponse = await $fetch.raw('/api/auth/login', {
			method: 'POST',
			body: { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }
		})

		const loginResult = loginResponse._data as { id: number; email: string; settings: string }
		console.log('Login successful:', loginResult.email)

		return {
			...loginResult,
			settings_object: JSON.parse(loginResult.settings || '{}')
		}
	} catch (error) {
		console.warn('Login failed, test user may not exist:', error)
		throw new Error('Failed to login test user. Ensure TEST_USER_EMAIL and TEST_USER_PASSWORD are set correctly.')
	}
}

export const generateTestDbName = () => {
	return `${TEST_DB_NAME_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

export const cleanupOldTestDatabases = async () => {
	// @ts-expect-error global $fetch is stubbed in setup.ts
	const list = await $fetch('/api/database/list') as Array<{ id: number; name: string }>
	const oldTestDbs = list.filter(db => db.name.startsWith(TEST_DB_NAME_PREFIX))
	for (const db of oldTestDbs) {
		try {
			// @ts-expect-error global $fetch is stubbed in setup.ts
			await $fetch('/api/database/delete', {
				method: 'DELETE',
				body: { databaseId: db.id, password: TEST_USER_PASSWORD }
			})
			console.log(`Cleaned up old test database: ${db.name}`)
		} catch {
			// Ignore errors - DB might already be deleted
		}
	}
}

export const deleteTestDatabase = async (dbId: number | null) => {
	if (!dbId) return
	try {
		// @ts-expect-error global $fetch is stubbed in setup.ts
		await $fetch('/api/database/delete', {
			method: 'DELETE',
			body: { databaseId: dbId, password: TEST_USER_PASSWORD }
		})
		console.log(`Cleaned up test database: ${dbId}`)
	} catch {
		// Ignore errors - DB might already be deleted
	}
}

export const updateSessionCookie = (cookie: string) => {
	// @ts-expect-error global cookie store from setup.ts
	globalThis.__testCookieStore = globalThis.__testCookieStore || { cookie: '' }
	// @ts-expect-error accessing test cookie store
	globalThis.__testCookieStore.cookie = cookie
}

export const getSessionCookie = () => {
	// @ts-expect-error global cookie store from setup.ts
	return globalThis.__testCookieStore?.cookie || ''
}

export const getSessionHeaders = () => {
	const cookie = getSessionCookie()
	return cookie ? { cookie } : {}
}
