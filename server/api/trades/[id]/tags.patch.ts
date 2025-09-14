import { prisma } from '../../../utils/prisma'
import auth from '../../../utils/auth'
import { createAppError } from '../../../utils/errors'
import { UpdateTradeTagsSchema } from '~/schema/trade'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId

    try {
        // Vérifier l'authentification
        const tradeId = parseInt(event.context.params?.id || '0')

        if (!tradeId) {
            throw createAppError({
                statusCode: 400,
                message: 'Missing trade ID',
                tag: 'api.trades.tags.patch.missing_id'
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
                tag: 'api.trades.tags.patch.not_found'
            })
        }

        const body = await readBody(event)

        // Valider les données entrantes
        const { tagIds } = UpdateTradeTagsSchema.parse(body)

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

            const validTagIds = userTags.map(tag => tag.id)

            // Créer les associations pour les tags valides
            await Promise.all(
                validTagIds.map(tagId =>
                    prisma.tradeTagAssociation.create({
                        data: {
                            tradeId,
                            tagId
                        }
                    })
                )
            )
        }

        // Récupérer les nouvelles associations pour les renvoyer
        const updatedTradeTags = await prisma.tradeTagAssociation.findMany({
            where: { tradeId },
            include: { tag: true }
        })

        return updatedTradeTags

    } catch (error) {

        throw createAppError({
            statusCode: 500,
            message: 'Error while updating trade tags',
            tag: 'api.trades.tags.patch.error',
            error
        })

    }
})
