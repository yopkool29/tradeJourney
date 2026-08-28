import { z } from 'zod'

export const TradeFilterValueSchema = z.union([
	z.number(),
	z.string(),
	z.tuple([z.number(), z.number(), z.number()]),
	z.array(z.number()),
	z.array(z.string()),
]).optional()

export const TradeFilterSchema = z.object({
	column: z.string(),
	operator: z.string(),
	value: TradeFilterValueSchema,
})

export const AnalyticsTradeFilterSchema = TradeFilterSchema.extend({
	column: z.enum([
		'openDate', 'closeDate', 'symbol', 'type', 'lot', 'openPrice', 'closePrice', 'stopLoss', 'takeProfit',
		'profit', 'netProfit', 'profit_points', 'commission', 'exchange', 'instrumentType', 'mae', 'mfe',
		'strikePrice', 'expirationDate', 'optionType', 'premium', 'accountId', 'importName', 'tags',
	]),
	operator: z.enum(['=', '!=', '>', '>=', '<', '<=', 'in']),
	value: z.union([z.number(), z.string(), z.array(z.number()).max(100), z.array(z.string()).max(100)]),
}).strict()

export type TradeFilterValue = number | string | [number, number, number] | number[] | string[] | undefined

export type TradeFilter = {
	column: string
	operator: string
	value: TradeFilterValue
}
