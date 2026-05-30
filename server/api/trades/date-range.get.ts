import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        const query = getQuery(event)
        const accountIds = query.accountIds ? JSON.parse(query.accountIds as string) : null

        const where: Record<string, unknown> = {}

        if (accountIds && Array.isArray(accountIds) && accountIds.length > 0) {
            where.accountId = { in: accountIds }
        }

        const result = await prisma.trade.aggregate({
            where,
            _min: {
                closeDate: true
            },
            _max: {
                closeDate: true
            }
        })

        return {
            minDate: result._min.closeDate,
            maxDate: result._max.closeDate
        }
    } catch (error) {
        throw createAppError({
            statusCode: 500,
            message: 'Error while retrieving dates',
            tag: 'api.trades.date-range.error',
            error
        })
    }
})
