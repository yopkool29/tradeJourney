import { getPrisma } from '../../../utils/db'
import { Prisma } from '~/generated/prisma-data'
import auth from '../../../utils/auth'
import { createAppError } from '../../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)

        const _userId = event.context.userId
        
        const id = parseInt(event.context.params?.id || '0')

        if (isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid trade ID',
                tag: 'api.trades.tags.delete.invalid_id'
            })
        }

        // Vérifier que le trade existe
        const trade = await prisma.trade.findUnique({
            where: { id }
        })

        if (!trade) {
            throw createAppError({
                statusCode: 404,
                message: 'Trade not found',
                tag: 'api.trades.tags.delete.not_found'
            })
        }

        await prisma.tradeTagAssociation.deleteMany({
            where: { tradeId: id }
        })

        return {
            success: true,
            message: 'Tags removed successfully',
        }

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error while removing tags',
            tag: 'api.trades.tags.delete.error',
            error
        })
    }
})
