import { z } from 'zod'

export const RiskRewardSchema = z.number().finite().min(0).max(500)
export const DetailedTradeNoteSchema = z.string()

export const OptionLegMetadataSchema = z.object({
	strike: z.union([z.number().finite(), z.string()]).optional(),
	type: z.string().optional(),
	qty: z.number().finite().optional(),
	price: z.number().finite().optional(),
	expiration: z.string().optional(),
}).strip()

export const KnownTradeMetadataSchema = z.object({
	riskReward: RiskRewardSchema.optional(),
	detailedNote: DetailedTradeNoteSchema.optional(),
	spreadType: z.string().optional(),
	posEffect: z.string().optional(),
	orderType: z.string().optional(),
	legs: z.array(OptionLegMetadataSchema).optional(),
}).strip()

export type KnownTradeMetadata = z.output<typeof KnownTradeMetadataSchema>
