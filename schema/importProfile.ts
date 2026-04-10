import { z } from 'zod'
import { InstrumentType } from '~/type'
import { nameFormatRefine } from './index'

export const INSTRUMENT_TYPES = [
    InstrumentType.Any,
    InstrumentType.Forex,
    InstrumentType.Future,
    InstrumentType.Stock,
    InstrumentType.Crypto,
    InstrumentType.Option
] as const

export const DEFAULT_INSTRUMENT_TYPE_BY_PROVIDER: Record<string, InstrumentType> = {
    mt5: InstrumentType.Forex,
    nt8: InstrumentType.Future,
    quantower: InstrumentType.Future,
    ibkr: InstrumentType.Stock,
    'ibkr-api': InstrumentType.Stock,
    standard: InstrumentType.Any,
}

// Schéma pour les métadonnées du profil d'import
export const ImportProfileMetadataSchema = z.object({
    useCloudStorage: z.boolean().optional().default(false),
}).passthrough() // Permet d'autres propriétés non définies

const tagRelationSchema = z.array(z.object({ tagId: z.number() })).default([]).transform((arr) => arr.map((t) => t.tagId))

export const ImportProfileSchema = z.object({
    id: z.number(),
    name: nameFormatRefine(z.string().min(3).max(64)),
    provider: z.string(),
    importMode: z.string().default('local'),
    timezone: z.string().default('Europe/Paris'),
    keepExistingTrades: z.boolean().default(false),
    instrumentType: z.nativeEnum(InstrumentType).default(InstrumentType.Any),
    ibkrFlexQueryToken: z.string().nullable().optional(),
    ibkrFlexQueryId: z.string().nullable().optional(),
    metadata: ImportProfileMetadataSchema.nullable().optional(),
    dayTags: tagRelationSchema,
    tradeTags: tagRelationSchema,
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
})

export type ImportProfileType = z.output<typeof ImportProfileSchema>;

export const CreateImportProfileSchema = z.object({
    name: nameFormatRefine(z.string().min(3).max(64)),
    provider: z.string(),
    importMode: z.string().default('local'),
    timezone: z.string().default('Europe/Paris'),
    keepExistingTrades: z.boolean().default(false),
    instrumentType: z.nativeEnum(InstrumentType).default(InstrumentType.Any),
    ibkrFlexQueryToken: z.string().nullable().optional(),
    ibkrFlexQueryId: z.string().nullable().optional(),
    metadata: ImportProfileMetadataSchema.nullable().optional(),
    dayTagIds: z.array(z.number()).default([]),
    tradeTagIds: z.array(z.number()).default([]),
}).superRefine((data, ctx) => {
    if (data.provider === 'ibkr-api') {
        if (!data.ibkrFlexQueryToken) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['ibkrFlexQueryToken'],
                params: { i18n: 'zodI18n.errors.required' },
            })
        }
        if (!data.ibkrFlexQueryId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['ibkrFlexQueryId'],
                params: { i18n: 'zodI18n.errors.required' },
            })
        }
    }
})

export type CreateImportProfileType = z.input<typeof CreateImportProfileSchema>;

export const UpdateImportProfileSchema = z.object({
    id: z.number(),
    name: nameFormatRefine(z.string().min(3).max(64)),
    provider: z.string(),
    importMode: z.string().default('local'),
    timezone: z.string().default('Europe/Paris'),
    keepExistingTrades: z.boolean().default(false),
    instrumentType: z.nativeEnum(InstrumentType).default(InstrumentType.Any),
    ibkrFlexQueryToken: z.string().nullable().optional(),
    ibkrFlexQueryId: z.string().nullable().optional(),
    metadata: ImportProfileMetadataSchema.nullable().optional(),
    dayTagIds: z.array(z.number()).default([]),
    tradeTagIds: z.array(z.number()).default([]),
}).superRefine((data, ctx) => {
    if (data.provider === 'ibkr-api') {
        if (!data.ibkrFlexQueryToken) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['ibkrFlexQueryToken'],
                params: { i18n: 'zodI18n.errors.required' },
            })
        }
        if (!data.ibkrFlexQueryId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['ibkrFlexQueryId'],
                params: { i18n: 'zodI18n.errors.required' },
            })
        }
    }
})

export type UpdateImportProfileType = z.input<typeof UpdateImportProfileSchema>;
