import bcrypt from 'bcryptjs'
import { getAuthDb } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

interface SecurityBody {
	currentPassword: string
	email?: string
	newPassword?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
	await auth(event)

	const authDb = getAuthDb()
	const userId = parseInt(event.context.userId)

	try {
		const body = await readBody<SecurityBody>(event)

		if (!body || !body.currentPassword) {
			throw createAppError({
				statusCode: 400,
				message: 'Current password is required',
				tag: 'api.auth.security.missing_password',
			})
		}

		const user = await authDb.user.findUnique({
			where: { id: userId },
		})

		if (!user) {
			throw createAppError({
				statusCode: 404,
				message: 'User not found',
				tag: 'api.auth.security.user_not_found',
			})
		}

		const passwordValid = await bcrypt.compare(body.currentPassword, user.password)
		if (!passwordValid) {
			throw createAppError({
				statusCode: 401,
				message: 'Current password is incorrect',
				tag: 'api.auth.security.wrong_password',
			})
		}

		const updateData: { email?: string; password?: string } = {}

		if (body.email && body.email !== user.email) {
			if (!EMAIL_REGEX.test(body.email)) {
				throw createAppError({
					statusCode: 400,
					message: 'Invalid email format',
					tag: 'api.auth.security.invalid_email',
				})
			}

			const existingUser = await authDb.user.findUnique({
				where: { email: body.email },
			})

			if (existingUser && existingUser.id !== userId) {
				throw createAppError({
					statusCode: 409,
					message: 'Email is already in use',
					tag: 'api.auth.security.email_exists',
				})
			}

			updateData.email = body.email
		}

		if (body.newPassword) {
			if (body.newPassword.length < 5) {
				throw createAppError({
					statusCode: 400,
					message: 'Password must be at least 5 characters',
					tag: 'api.auth.security.password_too_short',
				})
			}

			updateData.password = await bcrypt.hash(body.newPassword, 10)
		}

		if (Object.keys(updateData).length === 0) {
			return { success: true, message: 'No changes to apply' }
		}

		await authDb.user.update({
			where: { id: userId },
			data: updateData,
		})

		return { success: true, message: 'Security settings updated' }
	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({
			statusCode: 500,
			message: 'An error occurred while updating security settings',
			tag: 'api.auth.security.update_error',
			error,
		})
	}
})
