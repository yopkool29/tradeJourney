import { getHeader, getRequestURL, type H3Event } from 'h3'
import { getAuthDb } from './db'
import { createAppError } from './errors'

const unauthorized = () => createAppError({
	statusCode: 401,
	tag: 'api.auth.verify.unauthorized',
	message: 'Unauthorized'
})

const databaseNotFound = () => createAppError({
	statusCode: 404,
	tag: 'api.database.common.not_found',
	message: 'Database not found'
})

const invalidDatabaseId = () => createAppError({
	statusCode: 400,
	tag: 'api.database.common.invalid_id',
	message: 'Invalid database ID'
})

const apiTokenReadPaths = new Set([
	'/api/database/list',
	'/api/account',
	'/api/tags',
	'/api/notes',
	'/api/trades',
	'/api/analytics/summary',
	'/api/analytics/breakdown',
	'/api/analytics/pnl_timeseries',
])

export const isApiTokenReadPath = (pathname: string): boolean => {
	return apiTokenReadPaths.has(pathname) || /^\/api\/trades\/\d+$/.test(pathname)
}

export const getApiDatabaseId = (value: string): number => {
	if (!/^\d+$/.test(value))
		throw invalidDatabaseId()

	const databaseId = Number(value)
	if (!Number.isSafeInteger(databaseId) || databaseId <= 0 || databaseId > 2147483647)
		throw invalidDatabaseId()

	return databaseId
}

export const apiTokenAuth = async (event: H3Event): Promise<void> => {
	if (event.method !== 'GET' || !isApiTokenReadPath(getRequestURL(event).pathname))
		throw unauthorized()

	const token = getHeader(event, 'x-api-token')
	if (!token)
		throw unauthorized()

	const authDb = getAuthDb()
	const user = await authDb.user.findUnique({
		where: { token },
		select: { id: true }
	})
	if (!user)
		throw unauthorized()

	event.context.userId = String(user.id)

	const databaseIdHeader = getHeader(event, 'x-database-id')
	if (databaseIdHeader === undefined)
		return

	const databaseId = getApiDatabaseId(databaseIdHeader)
	const database = await authDb.database.findFirst({
		where: {
			id: databaseId,
			userId: user.id
		},
		select: {
			id: true,
			name: true
		}
	})
	if (!database)
		throw databaseNotFound()

	event.context.databaseId = database.id
	event.context.dbName = database.name
}
