import { createAppError } from '../../utils/errors'
import { getApiContext } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

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
