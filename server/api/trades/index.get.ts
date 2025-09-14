import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { getColumnType } from '~/schema/trade'
import { isValid, addDays, startOfDay, endOfDay } from 'date-fns'
import type { TradeFilter } from '~/type'

import {
    OPERATOR_EQUAL,
    OPERATOR_GREATER_THAN,
    OPERATOR_GREATER_THAN_OR_EQUAL,
    OPERATOR_LESS_THAN,
    OPERATOR_LESS_THAN_OR_EQUAL,
    OPERATOR_IN,
} from '../../../utils/index'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé directement car géré par le middleware d'authentification et l'isolation par schéma

    try {

        let showInactive = false
        const query = getQuery(event)
        let filters: TradeFilter[] = []

        try {
            if (query.filters) {
                const parsed = JSON.parse(query.filters as string)
                filters = Array.isArray(parsed) ? parsed as TradeFilter[] : []
            }
            if (query.showInactive) {
                showInactive = query.showInactive === 'true'
            }
        } catch {
            filters = []
        }

        // Prisma where clause with AND for multiple filters
        // Note: userId is no longer needed in filters as we're using PostgreSQL schema isolation
        const where: Record<string, unknown> = {}
        if (Array.isArray(filters) && filters.length > 0) {
            where.AND = [
                ...filters
                    .filter(f => typeof f === 'object' && f !== null && 'column' in f && 'operator' in f && 'value' in f)
                    .filter(f => f.column === 'accountId' && f.operator === '=' && f.value === -1 ? false : true)
                    .map(f => {
                        const filter = f as { column: string; operator: string; value: unknown }
                        let prismaOperator: string
                        switch (filter.operator) {
                            case OPERATOR_EQUAL: prismaOperator = 'equals'; break
                            case OPERATOR_GREATER_THAN: prismaOperator = 'gt'; break
                            case OPERATOR_LESS_THAN: prismaOperator = 'lt'; break
                            case OPERATOR_GREATER_THAN_OR_EQUAL: prismaOperator = 'gte'; break
                            case OPERATOR_LESS_THAN_OR_EQUAL: prismaOperator = 'lte'; break
                            case OPERATOR_IN: prismaOperator = 'in'; break
                            default: prismaOperator = 'equals'
                        }
                        const type = getColumnType(filter.column)
                        let value: unknown = filter.value
                        if (type === 'number') value = Number(filter.value)
                        if (type === 'date') {
                            if (typeof filter.value === 'number') {
                                value = new Date(filter.value)
                            } else if (typeof filter.value === 'string') {
                                value = new Date(filter.value)
                            } else {
                                value = filter.value
                            }
                            if (!isValid(value))
                                return undefined
                            // Si égalité, on veut tous les trades du jour (peu importe l'heure)
                            if (prismaOperator === 'equals') {
                                const start = startOfDay(value as Date)
                                const nextDay = addDays(start, 1)
                                return {
                                    [filter.column]: {
                                        gte: start,
                                        lt: nextDay
                                    }
                                }
                            } else if (prismaOperator === 'lt') {
                                const start = startOfDay(value as Date)
                                return {
                                    [filter.column]: {
                                        lt: start,
                                    }
                                }
                            } else if (prismaOperator === 'gt') {
                                const start = endOfDay(value as Date)
                                return {
                                    [filter.column]: {
                                        gt: start,
                                    }
                                }
                            } else if (prismaOperator === 'lte') {
                                const start = endOfDay(value as Date)
                                return {
                                    [filter.column]: {
                                        lte: start,
                                    }
                                }
                            } else if (prismaOperator === 'gte') {
                                const start = startOfDay(value as Date)

                                return {
                                    [filter.column]: {
                                        gte: start,
                                    }
                                }
                            }
                        }

                        // Gestion spéciale pour l'opérateur 'in' avec les tableaux
                        if (prismaOperator === 'in' && Array.isArray(filter.value)) {
                            return {
                                [filter.column]: {
                                    in: filter.value
                                }
                            }
                        }

                        return {
                            [filter.column]: { [prismaOperator]: value }
                        }
                    })
                    .filter(Boolean) // enlève les undefined (dates invalides)

            ]
        }

        if (!showInactive)
            where.active = true

        // Récupérer les trades avec leurs associations de tags
        const trades = await prisma.trade.findMany({
            where,
            take: 1000,
            orderBy: { openDate: 'desc' },
            include: {
                tags: {
                    include: {
                        tag: true,
                    }
                },
                account: true,
                screenshots: true
            }
        })

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

    } catch (err) {
        throw createAppError({
            statusCode: 500,
            message: 'Erreur lors de la récupération des trades',
            error: err
        })
    }
})