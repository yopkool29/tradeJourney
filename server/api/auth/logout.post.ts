import { deleteCookie } from 'h3'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {

        // Supprimer le cookie de token
        // En mode desktop (Tauri), on est en HTTP localhost donc secure doit être désactivé
        const isDesktop = process.env.PNLTRACKER_DESKTOP === 'true'
        deleteCookie(event, 'token', {
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production' && !isDesktop,
            sameSite: isDesktop ? 'lax' : 'strict'
        })

        return {
            success: true,
            message: 'Successfully logged out'
        }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
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
