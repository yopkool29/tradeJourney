import { getAuthDb } from '../../utils/db'
import { Prisma } from '~/generated/prisma-auth'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    
    try {
        const prisma = getAuthDb()
        const userId = Number(event.context.userId)

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                token: true,
                settings: true
            }
        })

        if (!user) {
            throw createAppError({
                statusCode: 401,
                message: 'User not found',
                tag: 'api.auth.verify.user_not_found'
            })
        }

        return {
            id: user.id,
            email: user.email,
            token: user.token,
            settings: user.settings
        }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while verifying authentication',
            tag: 'api.auth.verify.server_error',
            error
        })
    }
})
