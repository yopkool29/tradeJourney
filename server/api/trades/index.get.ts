import type { Prisma } from '~/generated/prisma-data'
import type { TradeFilter } from '~/type'
import { buildTradeWhere } from '../../services/tradeFilters'
import { getApiContext } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        let showInactive = false
        const query = getQuery(event)
        let filters: TradeFilter[] = []
        let limit = 1000 // Valeur par défaut
        let offset = 0
        const isCount = query.count === 'true'

        try {
            if (query.filters) {
                const parsed = JSON.parse(query.filters as string)
                filters = Array.isArray(parsed) ? parsed as TradeFilter[] : []
            }
            if (query.showInactive) {
                showInactive = query.showInactive === 'true'
            }
            if (query.limit !== undefined) {
                const parsedLimit = parseInt(query.limit as string, 10)
                if (!isNaN(parsedLimit)) {
                    limit = parsedLimit
                }
            }
            if (query.offset !== undefined) {
                const parsedOffset = parseInt(query.offset as string, 10)
                if (!isNaN(parsedOffset) && parsedOffset >= 0) {
                    offset = parsedOffset
                }
            }
        } catch {
            filters = []
        }

        const where = buildTradeWhere(filters, showInactive)

        if (isCount) {
            const result = await prisma.trade.count({ where })
            return { count: result }
        }

        // Récupérer les trades avec leurs associations de tags
        const queryOptions: Prisma.TradeFindManyArgs = {
            where,
            orderBy: [{ openDate: 'desc' }, { id: 'desc' }],
            include: {
                tags: {
                    include: {
                        tag: true,
                    }
                },
                account: true,
                screenshots: true
            }
        }

        // N'appliquer take que si limit >= 0
        if (limit >= 0) {
            queryOptions.take = limit
        }
        if (offset > 0) {
            queryOptions.skip = offset
        }

        const trades = await prisma.trade.findMany(queryOptions)

        // Transformer les résultats pour correspondre au type TradeWithTags
        const tradesWithTags = trades.map(trade => {
            const { tags: tagAssociations, screenshots, account, ...tradeData } = trade
            return {
                ...tradeData,
                tags: tagAssociations.map(assoc => assoc.tag),
                account_displayName: account.displayName,
                screenshots: screenshots
            }
        })


        return tradesWithTags

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error while retrieving trades',
            tag: 'api.trades.get.error',
            error
        })
    }
})