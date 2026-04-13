import { getPrisma } from '../../../utils/db'
import auth from '../../../utils/auth'
import { createAppError } from '../../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        
        const _userId = event.context.userId
        
        const tradeId = parseInt(event.context.params?.id || '0')

        if (isNaN(tradeId)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid trade ID',
                tag: 'api.trades.tags.get.invalid_id'
            })
        }

        // Vérifier que le trade appartient à l'utilisateur
        const trade = await prisma.trade.findUnique({
            where: {
                id: tradeId
            }
        })

        if (!trade) {
            throw createAppError({
                statusCode: 404,
                message: 'Trade not found',
                tag: 'api.trades.tags.get.not_found'
            })
        }

        // Récupérer les tags associés au trade
        const tradeTags = await prisma.tradeTagAssociation.findMany({
            where: { tradeId },
            include: { tag: true }
        })

        return tradeTags

    } catch (error) {

        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }
        
        throw createAppError({
            statusCode: 500,
            message: 'Error while retrieving trade tags',
            tag: 'api.trades.tags.get.error',
            error
        })

    }
})
