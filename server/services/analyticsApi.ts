import type { PrismaClient as DataPrismaClient } from '~/generated/prisma-data'
import {
	AnalyticsDimensionSchema,
	AnalyticsIntervalSchema,
	AnalyticsModeSchema,
} from '~/schema/analytics'
import type { TradeExtendedType } from '~/schema/trade'
import { AnalyticsTradeFilterSchema } from '~/schema/tradeFilter'
import type { TradeFilter } from '~/type'
import type { ZodType } from 'zod'
import { z } from 'zod'
import { createAppError } from '../utils/errors'
import { buildTradeWhere } from './tradeFilters'
import type { AnalyticsDimension, AnalyticsInterval, AnalyticsMode, AnalyticsTrade } from './analyticsTypes'

export type AnalyticsBaseQuery = {
	mode: AnalyticsMode
	filters: TradeFilter[]
	show_inactive: boolean
}

export type AnalyticsBreakdownQuery = AnalyticsBaseQuery & {
	dimension: AnalyticsDimension
}

export type AnalyticsTimeseriesQuery = AnalyticsBaseQuery & {
	interval: AnalyticsInterval
}

const singleQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const booleanQuerySchema = z.preprocess(singleQueryValue, z.enum(['true', 'false']).default('false')).transform(value => value === 'true')
const modeQuerySchema = z.preprocess(singleQueryValue, AnalyticsModeSchema.default('net'))
const filtersQuerySchema = z.preprocess(value => {
	const queryValue = singleQueryValue(value)
	if (queryValue === undefined) return []
	if (typeof queryValue !== 'string') return queryValue
	return JSON.parse(queryValue) as unknown
}, z.array(AnalyticsTradeFilterSchema))

export const analyticsBaseQuerySchema = z.object({
	mode: modeQuerySchema,
	filters: filtersQuerySchema,
	show_inactive: booleanQuerySchema,
})

export const analyticsBreakdownQuerySchema = analyticsBaseQuerySchema.extend({
	dimension: z.preprocess(singleQueryValue, AnalyticsDimensionSchema),
})

export const analyticsTimeseriesQuerySchema = analyticsBaseQuerySchema.extend({
	interval: z.preprocess(singleQueryValue, AnalyticsIntervalSchema.default('day')),
})

export const parseAnalyticsQuery = <T>(schema: ZodType<T>, query: unknown): T => {
	try {
		const result = schema.safeParse(query)
		if (result.success) return result.data
		throw createAppError({
			statusCode: 400,
			message: 'Invalid analytics query parameters',
			tag: 'api.analytics.invalid_query',
			data: { issues: result.error.issues },
		})
	} catch (error) {
		if (error && typeof error === 'object' && 'statusCode' in error) throw error
		throw createAppError({
			statusCode: 400,
			message: 'Invalid analytics query parameters',
			tag: 'api.analytics.invalid_query',
			error,
		})
	}
}

export const loadAnalyticsTrades = async (prisma: DataPrismaClient, query: AnalyticsBaseQuery): Promise<AnalyticsTrade[]> => {
	const trades = await prisma.trade.findMany({
		where: buildTradeWhere(query.filters, query.show_inactive),
		orderBy: { closeDate: 'asc' },
		include: {
			tags: { include: { tag: true } },
			account: true,
		},
	})
	return trades.map(trade => {
		const { tags, account, ...tradeData } = trade
		return {
			...tradeData,
			tags: tags.map(association => association.tag),
			account_displayName: account.displayName,
			screenshots: [],
		} as unknown as TradeExtendedType
	})
}

export const handleAnalyticsError = (error: unknown, tag: string): never => {
	if (error && typeof error === 'object' && 'statusCode' in error && 'data' in error) throw error
	throw createAppError({
		statusCode: 500,
		message: 'Error while retrieving analytics',
		tag,
		error,
	})
}
