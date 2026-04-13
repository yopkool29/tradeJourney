import { getPrisma } from '../../../utils/db'
import auth from '../../../utils/auth'
import { createAppError } from '../../../utils/errors'

export default defineEventHandler(async (event) => {
    // Authentification obligatoire
    await auth(event)
    
    try {
        const prisma = await getPrisma(event)

        const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification
        
        const id = parseInt(event.context.params?.id || '')

        if (isNaN(id)) {
            throw createAppError({ 
                statusCode: 400, 
                message: 'Invalid trade ID',
                tag: 'api.trades.undelete.invalid_id'
            })
        }

        const trade = await prisma.trade.update({
            where: { id },
            data: { active: true }
        }).catch(() => {
            throw createAppError({
                statusCode: 404,
                message: 'Trade not found',
                tag: 'api.trades.undelete.not_found'
            })
        })

        return trade

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error while restoring trade',
            tag: 'api.trades.undelete.error',
            error
        })

    }

})