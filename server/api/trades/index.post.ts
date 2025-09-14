import { prisma } from '../../utils/prisma'
import { generateUniqueId } from '~/schema/trade'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId
    
    try {

        const body = await readBody(event)

        // Validation basique des screenshots
        if (body.screenshots && !Array.isArray(body.screenshots)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid screenshots format',
                tag: 'api.trades.create.invalid_screenshots'
            })
        }

        // Validation des données requises
        if (!body.accountId || !body.symbol || !body.openDate) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid trade data',
                tag: 'api.trades.create.validation_error'
            })
        }

        const uniqueId = generateUniqueId(body.accountId, body.symbol, body.openDate, body.closeDate)

        // Extraire screenshots du body pour le formater correctement
        const { screenshots, ...tradeData } = body

        // Créer le trade avec le format correct pour les relations Prisma
        const trade = await prisma.trade.create({
            data: {
                ...tradeData,
                uniqueId,
                active: true,
                // Si screenshots est fourni, le formater correctement pour Prisma
                ...(Array.isArray(screenshots) && screenshots.length > 0 ? {
                    screenshots: {
                        connect: screenshots.map(s => ({ id: s.id }))
                    }
                } : {
                    screenshots: { create: [] }
                })
            }
        })

        return trade
    } catch (error) {
        const err = error as { statusCode?: number; tag?: string }
        if (err.statusCode && err.tag) {
            throw err
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while creating the trade',
            tag: 'api.trades.create.server_error',
            error
        })
    }
})
