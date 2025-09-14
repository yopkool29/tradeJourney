import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const userId = event.context.userId
    
    try {

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
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
            settings: user.settings
        }
    } catch (error) {
        const err = error as { statusCode?: number; tag?: string }
        if (err.statusCode && err.tag) {
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
