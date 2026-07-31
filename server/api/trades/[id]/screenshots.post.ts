import { createAppError } from '../../../utils/errors'
import { getApiContext, getValidatedId, parseBody } from '../../../utils/apiHelpers'
import { z } from 'zod'

// Schéma de validation pour les URLs des screenshots
const ScreenshotsUrlsSchema = z.object({
    urls: z.array(z.string())
})

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        const id = getValidatedId(event, 'id', 'api.trades.screenshots.post.invalid_id')

        // Vérifier que le trade existe
        await prisma.trade.findUniqueOrThrow({ 
            where: { id },
            select: { id: true }
        })

        // Valider le corps de la requête
        const { urls } = await parseBody(event, ScreenshotsUrlsSchema)

        // Limiter à 3 screenshots maximum
        const limitedUrls = urls.slice(0, 3)

        // Créer les screenshots dans la base de données
        for (const url of limitedUrls) {
            await prisma.screenshot.create({
                data: {
                    url,
                    tradeId: id
                }
            })
        }

        // Récupérer le trade mis à jour avec ses screenshots
        const updatedTrade = await prisma.trade.findUnique({
            where: { id },
            include: { screenshots: true }
        })

        return updatedTrade
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }
        
        throw createAppError({
            statusCode: 500,
            message: 'Error while saving files',
            tag: 'api.trades.screenshots.post.error',
            error: error
        })
    }
})
