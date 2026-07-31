import { createAppError } from '../../../utils/errors'
import { getApiContext, getValidatedId } from '../../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    // Authentification obligatoire
    try {
        const { prisma } = await getApiContext(event)

        const id = getValidatedId(event, 'id', 'api.trades.undelete.invalid_id')

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