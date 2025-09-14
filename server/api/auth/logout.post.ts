import { deleteCookie } from 'h3'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {

        // Supprimer le cookie de token
        deleteCookie(event, 'token', {
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        })

        return {
            success: true,
            message: 'Successfully logged out'
        }
    } catch (error) {
        const err = error as { statusCode?: number; tag?: string }
        if (err.statusCode && err.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred during logout',
            tag: 'api.auth.logout.server_error',
            error
        })
    }
})
