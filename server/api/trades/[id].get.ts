import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        
        const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification
        
        const id = parseInt(event.context.params?.id || '')
        
        if (isNaN(id)) {
            throw createAppError({ statusCode: 400, message: 'Invalid trade ID' })
        }

        // Récupérer le trade
        const trade = await prisma.trade.findUnique({
            where: { id, active: true },
            include: {
                tags: {
                    include: {
                        tag: true
                    }
                },
                account: true,
                screenshots: true
            }
        })

        if (!trade) {
            throw createAppError({ 
                statusCode: 404, 
                message: 'Trade not found',
                tag: 'api.trades.get.not_found'
            })
        }

        // Transformer le résultat pour correspondre au type TradeWithTags
        const { tags: tagAssociations, screenshots, account, ...tradeData } = trade
        const tradeWithTags = {
            ...tradeData,
            tags: tagAssociations.map(assoc => assoc.tag),
            screenshots: screenshots,
            account_displayName: account.displayName,
        }

        return tradeWithTags

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error while retrieving trade',
            tag: 'api.trades.get.error',
            error
        })
    }
})
