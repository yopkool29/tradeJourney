import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {

        const accountId = Number(event.context.params?.id)

        // Vérification de l'ID du compte
        if (!accountId || isNaN(accountId)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid account ID',
                tag: 'api.account.delete.invalid_id'
            })
        }

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
        const err = error as { statusCode?: number; tag?: string }
        if (err.statusCode && err.tag) {
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
