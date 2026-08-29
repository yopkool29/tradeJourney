import { describe, expect, it } from 'vitest'
import { getApiDatabaseId, isApiTokenReadPath, isApiTokenRequestAllowed } from '../../server/utils/apiTokenAuth'

describe('API token authentication', () => {
	it.each([
		['1', 1],
		['42', 42],
		['0007', 7]
	])('accepts the positive integer database ID %s', (value, expected) => {
		expect(getApiDatabaseId(value)).toBe(expected)
	})

	it.each(['', '0', '-1', '1.5', '1abc', '9007199254740992'])('rejects the invalid database ID %s', (value) => {
		expect(() => getApiDatabaseId(value)).toThrow(expect.objectContaining({
			statusCode: 400,
			message: 'Invalid database ID'
		}))
	})

	it('only allows the MCP read routes', () => {
		expect(isApiTokenReadPath('/api/database/list')).toBe(true)
		expect(isApiTokenReadPath('/api/trades/42')).toBe(true)
		expect(isApiTokenReadPath('/api/analytics/summary')).toBe(true)
		expect(isApiTokenReadPath('/api/notes')).toBe(true)
		expect(isApiTokenReadPath('/api/auth')).toBe(false)
		expect(isApiTokenReadPath('/api/backup/download')).toBe(false)
		expect(isApiTokenReadPath('/api/notes/42')).toBe(false)
		expect(isApiTokenReadPath('/api/trades/42/screenshots')).toBe(false)
	})

	it('only allows the dedicated MCP journal write route', () => {
		expect(isApiTokenRequestAllowed('POST', '/api/mcp/ai-journal')).toBe(true)
		expect(isApiTokenRequestAllowed('POST', '/api/notes')).toBe(false)
		expect(isApiTokenRequestAllowed('PATCH', '/api/notes/42')).toBe(false)
		expect(isApiTokenRequestAllowed('DELETE', '/api/notes/42')).toBe(false)
	})

})
