import { $fetch } from 'ofetch'

// Test configuration
export const TEST_USER_EMAIL = 'test@example.com'
export const TEST_USER_PASSWORD = 'testpassword'
export const TEST_DB_NAME_PREFIX = 'integration_test_'
export const BASE_URL = process.env.TEST_BASE_URL || `http://localhost:${process.env.EXTERNAL_PORT || 3000}`

// Store session cookie for authenticated requests
let sessionCookie = ''

export const getSessionCookie = () => sessionCookie

export const updateSessionCookie = (cookie: string) => {
	sessionCookie = cookie
}

export const checkServerRunning = async () => {
	try {
		await $fetch(`${BASE_URL}/api/auth`, { ignoreResponseError: true })
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
		const loginResponse = await $fetch.raw(`${BASE_URL}/api/auth/login`, {
			method: 'POST',
			body: { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }
		})

		// Extract session cookie from response headers
		const setCookie = loginResponse.headers.get('set-cookie')
		if (setCookie) {
			sessionCookie = setCookie.split(';')[0]
			console.log('Session cookie captured')
		}

		const loginResult = loginResponse._data as { id: number; email: string; settings: string }
		console.log('Login successful:', loginResult.email)

		// Configure global $fetch to include session cookie via interceptor
		// @ts-ignore - override global $fetch
		globalThis.$fetch = $fetch.create({
			baseURL: BASE_URL,
			onRequest: ({ options }) => {
				if (sessionCookie) {
					options.headers = options.headers || {}
					if (options.headers instanceof Headers) {
						options.headers.set('cookie', sessionCookie)
					} else if (typeof options.headers === 'object' && !Array.isArray(options.headers)) {
						(options.headers as Record<string, string>).cookie = sessionCookie
					}
				}
			}
		})

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
	const { fetchDatabases, deleteDatabase, databases } = useDatabase()
	await fetchDatabases()

	const oldTestDbs = databases.value.filter(db => db.name.startsWith(TEST_DB_NAME_PREFIX))
	for (const db of oldTestDbs) {
		try {
			await deleteDatabase(db.id, TEST_USER_PASSWORD)
			console.log(`Cleaned up old test database: ${db.name}`)
		} catch {
			// Ignore errors - DB might already be deleted
		}
	}
}

export const deleteTestDatabase = async (dbId: number | null) => {
	if (!dbId) return

	const { deleteDatabase, currentDatabase, clearCurrentDatabase } = useDatabase()
	if (currentDatabase.value?.id === dbId) {
		clearCurrentDatabase()
	}
	try {
		await deleteDatabase(dbId, TEST_USER_PASSWORD)
		console.log(`Cleaned up test database: ${dbId}`)
	} catch {
		// Ignore errors - DB might already be deleted
	}
}
