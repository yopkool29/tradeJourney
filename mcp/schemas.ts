import {
	AnalyticsBreakdownSchema,
	AnalyticsDimensionSchema,
	AnalyticsIntervalSchema,
	AnalyticsModeSchema,
	AnalyticsSummarySchema,
	PnlTimeseriesSchema,
} from '~/schema/analytics'
import { KnownNoteMetadataSchema } from '~/schema/note'
import { KnownTradeMetadataSchema } from '~/schema/tradeMetadata'
import { z } from 'zod'

export const PnlModeSchema = AnalyticsModeSchema
export const BreakdownDimensionSchema = AnalyticsDimensionSchema
export const TimeseriesIntervalSchema = AnalyticsIntervalSchema
export const AnalyticsSummaryResponseSchema = AnalyticsSummarySchema
export const AnalyticsBreakdownResponseSchema = AnalyticsBreakdownSchema
export const PnlTimeseriesResponseSchema = PnlTimeseriesSchema
export const NoteMetadataSchema = KnownNoteMetadataSchema
export const TradeMetadataSchema = KnownTradeMetadataSchema

const dateRangeFields = {
	date_from: z.string().datetime({ offset: true }).optional(),
	date_to: z.string().datetime({ offset: true }).optional(),
}

const isValidDateRange = (value: { date_from?: string; date_to?: string }) => {
	return !value.date_from || !value.date_to || new Date(value.date_from) <= new Date(value.date_to)
}

export const TradeFiltersSchema = z.object({
	...dateRangeFields,
	date_field: z.enum(['openDate', 'closeDate']).default('closeDate'),
	symbols: z.array(z.string().min(1).max(64)).max(50).optional(),
	account_ids: z.array(z.number().int().positive()).max(50).optional(),
	tag_ids: z.array(z.number().int().positive()).max(100).optional(),
	sides: z.array(z.enum(['buy', 'sell'])).max(2).optional(),
	instrument_types: z.array(z.enum(['stock', 'future', 'forex', 'option', 'crypto', 'any'])).max(6).optional(),
	pnl_min: z.number().finite().optional(),
	pnl_max: z.number().finite().optional(),
}).strict().refine(isValidDateRange, {
	message: 'date_from must be before or equal to date_to',
}).refine(value => value.pnl_min === undefined || value.pnl_max === undefined || value.pnl_min <= value.pnl_max, {
	message: 'pnl_min must be lower than or equal to pnl_max',
})

export const DatabaseInputSchema = z.object({
	database_id: z.number().int().positive(),
}).strict()

export const ListDailyNotesInputSchema = DatabaseInputSchema.extend({
	...dateRangeFields,
	page: z.number().int().positive().default(1),
	page_size: z.number().int().min(1).max(50).default(20),
}).strict()

export const SearchTradesInputSchema = DatabaseInputSchema.extend({
	filters: TradeFiltersSchema.default({ date_field: 'closeDate' }),
	pnl_mode: PnlModeSchema.default('net'),
	page: z.number().int().positive().default(1),
	page_size: z.number().int().min(1).max(200).default(50),
}).strict()

export const GetTradeInputSchema = DatabaseInputSchema.extend({
	trade_id: z.number().int().positive(),
}).strict()

export const AnalyticsInputSchema = DatabaseInputSchema.extend({
	filters: TradeFiltersSchema.default({ date_field: 'closeDate' }),
	pnl_mode: PnlModeSchema.default('net'),
}).strict()

export const BreakdownInputSchema = AnalyticsInputSchema.extend({
	dimension: BreakdownDimensionSchema,
}).strict()

export const TimeseriesInputSchema = AnalyticsInputSchema.extend({
	interval: TimeseriesIntervalSchema,
}).strict()

export const GetNoteImageInputSchema = DatabaseInputSchema.extend({
	image_path: z.string().min(1).max(500).regex(/^screenshots\/[a-zA-Z0-9_\-]+\.(png|jpg|jpeg|gif|webp|svg)$/i),
}).strict()

export type PnlMode = z.output<typeof PnlModeSchema>
export type TradeFilters = z.output<typeof TradeFiltersSchema>
