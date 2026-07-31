import { createAppError } from '../../../utils/errors'
import { getApiContext, getValidatedId, parseBody } from '../../../utils/apiHelpers'
import { UpdateTradeTagsSchema } from '~/schema/trade'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        const tradeId = getValidatedId(event, 'id', 'api.trades.tags.patch.missing_id')

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
                tag: 'api.trades.tags.patch.not_found'
            })
        }

        // Valider les données entrantes
        const { tagIds } = await parseBody(event, UpdateTradeTagsSchema)

        // Supprimer les associations existantes
        await prisma.tradeTagAssociation.deleteMany({
            where: { tradeId }
        })

        // Créer les nouvelles associations
        if (tagIds && tagIds.length > 0) {
            // Vérifier que tous les tags appartiennent à l'utilisateur
            const userTags = await prisma.tag.findMany({
                where: {
                    id: { in: tagIds }
                }
            })

            const validTagIds = new Set(userTags.map(tag => tag.id))
            // Conserver l'ordre des tagIds envoyés par l'utilisateur
            const orderedTagIds = tagIds.filter(id => validTagIds.has(id))

            // Créer les associations pour les tags valides (séquentiellement pour préserver l'ordre)
            for (const tagId of orderedTagIds) {
                await prisma.tradeTagAssociation.create({
                    data: {
                        tradeId,
                        tagId
                    }
                })
            }
        }

        // Récupérer les nouvelles associations pour les renvoyer
        const updatedTradeTags = await prisma.tradeTagAssociation.findMany({
            where: { tradeId },
            include: { tag: true }
        })

        return updatedTradeTags

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error while updating trade tags',
            tag: 'api.trades.tags.patch.error',
            error
        })

    }
})
