import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		return { ok: true }
	} catch (error) {
		throw createAppError({
			statusCode: 500,
			message: 'An error occurred while checking authentication',
			tag: 'api.auth.check.server_error',
			error
		})
	}
})
