import { vi } from 'vitest'

const testBaseUrl = process.env.TEST_BASE_URL || `http://localhost:${process.env.EXTERNAL_PORT || 3000}`

// Shared cookie storage for test API calls
const testCookieStore = { cookie: '' }

// @ts-expect-error expose for test-helpers
globalThis.__testCookieStore = testCookieStore

const makeRequest = async (url: string, options: RequestInit = {}) => {
	const fullUrl = url.startsWith('http') ? url : `${testBaseUrl}${url}`
	const headers = new Headers(options.headers || {})
	if (testCookieStore.cookie) {
		headers.set('cookie', testCookieStore.cookie)
	}

	const isJsonBody = typeof options.body === 'object' && options.body !== null
	if (isJsonBody && !headers.has('content-type')) {
		headers.set('content-type', 'application/json')
	}

	const resp = await fetch(fullUrl, {
		...options,
		headers,
		body: isJsonBody ? JSON.stringify(options.body) : options.body
	})

	// Extract and store any new session cookie
	const setCookie = resp.headers.get('set-cookie')
	if (setCookie) {
		testCookieStore.cookie = setCookie.split(';')[0]
	}

	return resp
}

// Stub $fetch to route to the external dev server and preserve cookies
const customFetch = async (url: string, options: RequestInit & { ignoreResponseError?: boolean } = {}) => {
	const resp = await makeRequest(url, options)

	if (!resp.ok && !options.ignoreResponseError) {
		const text = await resp.text()
		const err = new Error(`HTTP ${resp.status}: ${text}`) as Error & { statusCode?: number }
		err.statusCode = resp.status
		throw err
	}

	return resp.ok ? await resp.json() : null
}

// Add .raw() like ofetch so test-helpers can inspect response headers
customFetch.raw = async (url: string, options: RequestInit & { ignoreResponseError?: boolean } = {}) => {
	const resp = await makeRequest(url, options)
	return {
		headers: resp.headers,
		status: resp.status,
		ok: resp.ok,
		_data: resp.ok || options.ignoreResponseError ? await resp.json() : null
	}
}

vi.stubGlobal('$fetch', customFetch)

// Mock localStorage for Node.js environment before @vue/devtools-kit initializes
if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
	const store: Record<string, string> = {}
	Object.defineProperty(globalThis, 'localStorage', {
		value: {
			getItem: (key: string) => store[key] ?? null,
			setItem: (key: string, value: string) => { store[key] = value },
			removeItem: (key: string) => { Reflect.deleteProperty(store, key) },
			clear: () => { Object.keys(store).forEach(k => Reflect.deleteProperty(store, k)) },
			get length() { return Object.keys(store).length },
			key: (index: number) => Object.keys(store)[index] ?? null,
		},
		writable: true,
	})
}
