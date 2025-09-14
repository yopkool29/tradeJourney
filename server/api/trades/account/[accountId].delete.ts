import { createAppError } from '../../../utils/errors'
import auth from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { deleteFiles } from '../../../utils'

// ------------------------------------------------
// Fonction réutilisable pour supprimer les trades d'un compte
// ------------------------------------------------
export interface DateFilter {
    startDate: Date;
    endDate: Date;
}

export async function deleteAccountTrades(accountId: number, deleteInactive?: boolean, dateFilter?: DateFilter) {
    // Vérifier que le compte existe
    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) {
        throw createAppError({ statusCode: 404, message: 'Account not found' })
    }

    const where: { accountId: number; active?: boolean; openDate?: { gte?: Date; lt?: Date } } = { accountId: accountId }

    if (deleteInactive !== undefined) {
        where.active = !deleteInactive
    }
    
    // Ajouter le filtre par date si spécifié
    if (dateFilter) {
        where.openDate = {
            gte: dateFilter.startDate,
            lt: dateFilter.endDate
        }
    }

    // Récupérer tous les trades du compte pour pouvoir supprimer les associations
    const trades = await prisma.trade.findMany({
        where: where,
        select: { id: true }
    })

    const tradeIds = trades.map(trade => trade.id)

    const screenshots = await prisma.screenshot.findMany({
        where: {
            tradeId: {
                in: tradeIds
            }
        }
    })

    // Supprimer les fichiers physiques des screenshots
    if (screenshots.length > 0) {
        deleteFiles(screenshots)
    }

    // Nombre de trades à supprimer pour le message de retour
    const count = tradeIds.length

    if (tradeIds.length > 0) {
        // Exécuter toutes les opérations de suppression dans une transaction
        await prisma.$transaction(async (tx) => {
            await tx.trade.deleteMany({
                where
            })
        })
    }

    return { count }
}

// ------------------------------------------------
// Suppression de tous les trades d'un compte (API endpoint)
// ------------------------------------------------

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé directement car géré par le middleware d'authentification

    try {
        const body = await readBody(event)

        const accountId = parseInt(event.context.params?.accountId || '')

        if (isNaN(accountId)) {
            throw createAppError({ statusCode: 400, message: 'Invalid account' })
        }

        const deleteInactive = body.deleteInactive === undefined ? undefined : Boolean(body.deleteInactive)
        
        // Utiliser la fonction réutilisable pour supprimer les trades
        const result = await deleteAccountTrades(accountId, deleteInactive)
        
        return { message: 'Trades deleted', count: result.count }

    } catch (err) {
        throw createAppError({
            statusCode: 500,
            message: 'Error deleting trades',
            error: err
        })
    }

})
