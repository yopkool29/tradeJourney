import { createAppError } from '../../../utils/errors'
import { getApiContext, getValidatedId } from '../../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        const tradeId = getValidatedId(event, 'id', 'api.trades.tags.get.invalid_id')

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
