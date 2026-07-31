import { createAppError } from '../../utils/errors'
import { getApiContext, getValidatedId } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        const id = getValidatedId(event, 'id', 'api.trades.delete.invalid_id')

        // Désactiver le trade (soft delete)
        await prisma.trade.update({
            where: { id },
            data: { active: false }
        }).catch(() => {
            throw createAppError({
                statusCode: 404,
                message: 'Trade not found',
                tag: 'api.trades.delete.not_found'
            })
        })

        // Retourner un succès
        return {
            success: true,
            message: 'Trade deleted successfully'
        }

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error while deleting trade',
            tag: 'api.trades.delete.error',
            error
        })

    }

})