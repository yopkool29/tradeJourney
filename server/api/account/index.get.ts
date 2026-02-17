import { getPrisma } from '../../utils/db'
import { Prisma } from '~/generated/prisma-data'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        const _userId = event.context.userId

        const accounts = await prisma.account.findMany({
            orderBy: { createdAt: 'asc' }
        })

        return accounts

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
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
