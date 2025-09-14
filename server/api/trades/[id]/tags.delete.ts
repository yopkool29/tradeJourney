import { prisma } from '../../../utils/prisma'
import auth from '../../../utils/auth'
import { createAppError } from '../../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId

    try {
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
        // Si c'est déjà une AppError, on la propage
        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error

        throw createAppError({
            statusCode: 500,
            message: 'Error while removing tags',
            tag: 'api.trades.tags.delete.error',
            error
        })
    }
})
