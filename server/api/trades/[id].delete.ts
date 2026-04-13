import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)

        const _userId = event.context.userId

        const id = parseInt(event.context.params?.id || '')

        // Vérification de la validité de l'ID
        if (isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid trade ID',
                tag: 'api.trades.delete.invalid_id'
            })
        }

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