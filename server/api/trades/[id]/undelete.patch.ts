import { prisma } from '../../../utils/prisma'
import auth from '../../../utils/auth'
import { createAppError } from '../../../utils/errors'

export default defineEventHandler(async (event) => {
    // Authentification obligatoire
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {
        const id = parseInt(event.context.params?.id || '')

        // Vérification de la validité de l'ID
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

        throw createAppError({
            statusCode: 500,
            message: 'Error while restoring trade',
            tag: 'api.trades.undelete.error',
            error
        })

    }

})