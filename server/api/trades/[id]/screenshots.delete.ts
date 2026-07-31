import { createAppError } from '../../../utils/errors'
import { getApiContext, getValidatedId, parseBody } from '../../../utils/apiHelpers'
import { z } from 'zod'

// Schéma de validation pour les IDs des screenshots à supprimer
const DeleteScreenshotsSchema = z.object({
    screenshotIds: z.array(z.number())
})

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        // Récupérer l'ID du trade depuis les paramètres de l'URL
        const tradeId = getValidatedId(event, 'id', 'api.trades.screenshots.delete.invalid_id')

        // Vérifier que le trade appartient à l'utilisateur
        const trade = await prisma.trade.findUnique({
            where: { id: tradeId },
            include: { account: true }
        })

        if (!trade) {
            throw createAppError({
                statusCode: 404,
                message: 'Trade not found',
                tag: 'api.trades.screenshots.delete.not_found'
            })
        }

        // Récupérer les IDs des screenshots à supprimer
        const { screenshotIds } = await parseBody(event, DeleteScreenshotsSchema)

        if (screenshotIds.length <= 0) {
            return trade
        }

        // Supprimer les screenshots spécifiés
        await prisma.screenshot.deleteMany({
            where: {
                id: { in: screenshotIds },
                tradeId: tradeId
            }
        })

        // Récupérer le trade mis à jour avec les screenshots restants
        const updatedTrade = await prisma.trade.findUnique({
            where: { id: tradeId },
            include: {
                screenshots: true,
                account: true,
                tags: {
                    include: {
                        tag: true
                    }
                }
            }
        })

        return updatedTrade
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error while deleting screenshots',
            tag: 'api.trades.screenshots.delete.error',
            error
        })
    }
})
