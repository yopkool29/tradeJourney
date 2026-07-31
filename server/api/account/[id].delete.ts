import { createAppError } from '../../utils/errors'
import { getApiContext, getValidatedId } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        const accountId = getValidatedId(event, 'id', 'api.account.delete.invalid_id')

        // Vérifier s'il y a des trades associés
        const tradeCount = await prisma.trade.count({
            where: { accountId: accountId }
        })

        if (tradeCount > 0) {
            throw createAppError({
                statusCode: 400,
                message: 'Cannot delete account with existing trades',
                tag: 'api.account.delete.has_trades'
            })
        }

        // Supprimer le compte
        await prisma.account.delete({
            where: { id: accountId }
        })

        return {
            success: true,
            message: 'Account successfully deleted',
        }

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while deleting the account',
            tag: 'api.account.delete.server_error',
            error
        })
    }
})
