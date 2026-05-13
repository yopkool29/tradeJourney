import type { H3Event, EventHandlerRequest } from 'h3'
import { createAppError } from '../../../utils/errors'
import auth from '../../../utils/auth'
import { getPrisma } from '../../../utils/db'
import { deleteFiles } from '../../../utils'
import { cleanupDayTagData } from '../../../utils/dayTagCleanup'
import type { Prisma } from '~/generated/prisma-data'

// ------------------------------------------------
// Fonction réutilisable pour supprimer les trades d'un compte
// ------------------------------------------------
export interface DateFilter {
    startDate: Date;
    endDate: Date;
}

export async function deleteAccountTrades(event: H3Event<EventHandlerRequest>, accountId: number, deleteInactive?: boolean, dateFilter?: DateFilter, importName?: string) {
    const prisma = await getPrisma(event)

    // Récupérer userId et dbName depuis le contexte
    const userId = Number(event.context.userId)
    const dbName = event.context.dbName as string

    const account = await prisma.account.findUnique({ where: { id: accountId } })

    if (!account) {
        throw createAppError({ statusCode: 404, message: 'Account not found' })
    }

    const where: Prisma.TradeWhereInput = { accountId: accountId }

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

    // Ajouter le filtre par importName si spécifié
    // Le uniqueId commence par le importName (ex: "NT8...", "MT5...", "Quantower...", "Default...")
    if (importName) {
        where.uniqueId = { startsWith: importName }
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
        deleteFiles(screenshots, userId, dbName)
    }

    // Nombre de trades à supprimer pour le message de retour
    const count = tradeIds.length

    if (tradeIds.length > 0) {
        // Exécuter toutes les opérations de suppression dans une transaction
        await prisma.$transaction(async (tx) => {
            await tx.trade.deleteMany({
                where
            })

            // Nettoyer les DayTags et DayTagAssociations orphelins
            await cleanupDayTagData(tx)
        })
    }

    return { count }
}

// ------------------------------------------------
// Suppression de tous les trades d'un compte (API endpoint)
// ------------------------------------------------

export default defineEventHandler(async (event) => {
    await auth(event)

    try {

        const _userId = event.context.userId // Non utilisé directement car géré par le middleware d'authentification

        const body = await readBody(event)

        const accountId = parseInt(event.context.params?.accountId || '')

        if (isNaN(accountId)) {
            throw createAppError({ statusCode: 400, message: 'Invalid account' })
        }

        const deleteInactive = body.deleteInactive === undefined ? undefined : Boolean(body.deleteInactive)

        // Utiliser la fonction réutilisable pour supprimer les trades
        const result = await deleteAccountTrades(event, accountId, deleteInactive)

        return { message: 'Trades deleted', count: result.count }

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error deleting trades',
            tag: 'api.trades.account.delete.error',
            error
        })
    }

})
