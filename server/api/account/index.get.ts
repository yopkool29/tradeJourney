import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId

    try {

        const accounts = await prisma.account.findMany({
            orderBy: { createdAt: 'asc' }
        })

        return accounts

    } catch (error) {
        const err = error as { statusCode?: number; tag?: string }
        if (err.statusCode && err.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while retrieving accounts',
            tag: 'api.account.list.server_error',
            error
        })
    }
})
