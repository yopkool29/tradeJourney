import type { McpConfig } from './config'

type QueryValue = string | number | boolean | undefined

type RequestOptions = {
	databaseId: number | undefined
	query: Record<string, QueryValue>
}

export class PnlTrackerApiError extends Error {
	readonly status: number | null

	constructor(message: string, status: number | null) {
		super(message)
		this.name = 'PnlTrackerApiError'
		this.status = status
	}
}

const getErrorMessage = (status: number): string => {
	if (status === 400) return 'The request was rejected by PnlTracker'
	if (status === 401 || status === 403) return 'PnlTracker authentication failed'
	if (status === 404) return 'The requested PnlTracker resource was not found'
	if (status === 429) return 'PnlTracker rate limit reached'
	return 'PnlTracker API request failed'
}

export class PnlTrackerApiClient {
	private readonly config: McpConfig

	constructor(config: McpConfig) {
		this.config = config
	}

	async get(path: string, options: RequestOptions): Promise<unknown> {
		const url = new URL(path, `${this.config.apiUrl}/`)
		for (const [key, value] of Object.entries(options.query)) {
			if (value !== undefined) url.searchParams.set(key, String(value))
		}

		const headers = new Headers({
			accept: 'application/json',
			'x-api-token': this.config.apiToken,
		})
		if (options.databaseId !== undefined) headers.set('x-database-id', String(options.databaseId))

		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs)
		try {
			const response = await fetch(url, { headers, signal: controller.signal })
			if (!response.ok) throw new PnlTrackerApiError(getErrorMessage(response.status), response.status)

			const contentType = response.headers.get('content-type') || ''
			if (!contentType.includes('application/json')) throw new PnlTrackerApiError('PnlTracker returned an invalid response', response.status)

			const contentLength = Number(response.headers.get('content-length') || 0)
			if (contentLength > this.config.maxResponseBytes) throw new PnlTrackerApiError('PnlTracker response is too large', response.status)

			const text = await response.text()
			if (Buffer.byteLength(text, 'utf8') > this.config.maxResponseBytes) throw new PnlTrackerApiError('PnlTracker response is too large', response.status)

			try {
				return JSON.parse(text) as unknown
			} catch {
				throw new PnlTrackerApiError('PnlTracker returned invalid JSON', response.status)
			}
		} catch (error) {
			if (error instanceof PnlTrackerApiError) throw error
			if (error instanceof Error && error.name === 'AbortError') throw new PnlTrackerApiError('PnlTracker API request timed out', null)
			throw new PnlTrackerApiError('PnlTracker API is unavailable', null)
		} finally {
			clearTimeout(timeout)
		}
	}

	async getBinary(path: string, options: RequestOptions): Promise<{ buffer: Buffer, mimeType: string }> {
		const url = new URL(path, `${this.config.apiUrl}/`)
		for (const [key, value] of Object.entries(options.query)) {
			if (value !== undefined) url.searchParams.set(key, String(value))
		}

		const headers = new Headers({
			'x-api-token': this.config.apiToken,
		})
		if (options.databaseId !== undefined) headers.set('x-database-id', String(options.databaseId))

		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs)
		try {
			const response = await fetch(url, { headers, signal: controller.signal })
			if (!response.ok) throw new PnlTrackerApiError(getErrorMessage(response.status), response.status)

			const mimeType = response.headers.get('content-type') || 'application/octet-stream'
			const contentLength = Number(response.headers.get('content-length') || 0)
			if (contentLength > this.config.maxResponseBytes) throw new PnlTrackerApiError('PnlTracker image is too large', response.status)

			const arrayBuffer = await response.arrayBuffer()
			const buffer = Buffer.from(arrayBuffer)
			if (buffer.byteLength > this.config.maxResponseBytes) throw new PnlTrackerApiError('PnlTracker image is too large', response.status)

			return { buffer, mimeType }
		} catch (error) {
			if (error instanceof PnlTrackerApiError) throw error
			if (error instanceof Error && error.name === 'AbortError') throw new PnlTrackerApiError('PnlTracker API request timed out', null)
			throw new PnlTrackerApiError('PnlTracker API is unavailable', null)
		} finally {
			clearTimeout(timeout)
		}
	}
}
