import { prisma } from '../../../utils/prisma'
import auth from '../../../utils/auth'
import { createAppError } from '../../../utils/errors'
import { z } from 'zod'

// Schéma de validation pour les URLs des screenshots
const ScreenshotsUrlsSchema = z.object({
    urls: z.array(z.string())
})

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {
        const id = parseInt(event.context.params?.id || '')
        if (isNaN(id)) {
            throw createAppError({ 
                statusCode: 400, 
                message: 'Invalid ID',
                tag: 'api.trades.screenshots.post.invalid_id'
            })
        }

        // Vérifier que le trade existe
        await prisma.trade.findUniqueOrThrow({ 
            where: { id },
            select: { id: true }
        })

        // Valider le corps de la requête
        const body = await readBody(event)
        const { urls } = ScreenshotsUrlsSchema.parse(body)

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
        // Si c'est déjà une AppError, on la propage
        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error
        
        throw createAppError({
            statusCode: 500,
            message: 'Error while saving files',
            tag: 'api.trades.screenshots.post.error',
            error: error
        })
    }
})
