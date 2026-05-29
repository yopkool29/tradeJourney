import { getPrisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)

        // Récupérer tous les trades avec commission négative
        const tradesWithNegativeCommission = await prisma.trade.findMany({
            where: {
                commission: {
                    lt: 0
                }
            },
            select: {
                id: true,
                commission: true,
                profit: true,
                netProfit: true
            }
        })

        if (tradesWithNegativeCommission.length === 0) {
            return {
                success: true,
                updated: 0,
                message: 'No negative commissions found'
            }
        }

        // Utiliser updateMany avec une transaction pour de meilleures performances
        // Prisma ne supporte pas updateMany avec des calculs dynamiques,
        // donc on utilise une raw query pour le batch update
        const tradeIds = tradesWithNegativeCommission
            .filter(t => t.commission !== null && t.commission < 0)
            .map(t => t.id)

        if (tradeIds.length === 0) {
            return {
                success: true,
                updated: 0,
                message: 'No negative commissions found'
            }
        }

        // Utiliser une raw query SQL pour mettre à jour tous les trades en une seule opération
        // commission = -commission (inverser le signe)
        // profit = netProfit - (-commission) = netProfit + commission
        await prisma.$executeRaw`
            UPDATE "Trade"
            SET 
                "commission" = -"commission"
            WHERE "id" = ANY(${tradeIds})
        `

        const updatedCount = tradeIds.length

        return {
            success: true,
            updated: updatedCount,
            message: `${updatedCount} trade(s) corrected`
        }
    } catch (error: unknown) {
        console.error('Error while correcting commissions:', error)
        const err = error as { message?: string }
        throw createAppError({
            statusCode: 500,
            message: err.message || 'Error while correcting commissions',
            error
        })
    }
})
