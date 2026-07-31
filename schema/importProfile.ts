import { z } from 'zod'
import { InstrumentType } from '~/type'
import { idField, nameField, nullableOptionalString, idArrayField, dateOrStringField } from './primitives'

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

const tagRelationSchema = z.array(z.object({ tagId: idField })).default([]).transform((arr) => arr.map((t) => t.tagId))

export const ImportProfileSchema = z.object({
    id: idField,
    name: nameField(3, 64),
    provider: z.string(),
    importMode: z.string().default('local'),
    timezone: z.string().default('Europe/Paris'),
    keepExistingTrades: z.boolean().default(false),
    instrumentType: z.nativeEnum(InstrumentType).default(InstrumentType.Any),
    ibkrFlexQueryToken: nullableOptionalString,
    ibkrFlexQueryId: nullableOptionalString,
    metadata: ImportProfileMetadataSchema.nullable().optional(),
    dayTags: tagRelationSchema,
    tradeTags: tagRelationSchema,
    createdAt: dateOrStringField,
    updatedAt: dateOrStringField,
})

export type ImportProfileType = z.output<typeof ImportProfileSchema>;

export const CreateImportProfileSchema = z.object({
    name: nameField(3, 64),
    provider: z.string(),
    importMode: z.string().default('local'),
    timezone: z.string().default('Europe/Paris'),
    keepExistingTrades: z.boolean().default(false),
    instrumentType: z.nativeEnum(InstrumentType).default(InstrumentType.Any),
    ibkrFlexQueryToken: nullableOptionalString,
    ibkrFlexQueryId: nullableOptionalString,
    metadata: ImportProfileMetadataSchema.nullable().optional(),
    dayTagIds: idArrayField.default([]),
    tradeTagIds: idArrayField.default([]),
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
    id: idField,
    name: nameField(3, 64),
    provider: z.string(),
    importMode: z.string().default('local'),
    timezone: z.string().default('Europe/Paris'),
    keepExistingTrades: z.boolean().default(false),
    instrumentType: z.nativeEnum(InstrumentType).default(InstrumentType.Any),
    ibkrFlexQueryToken: nullableOptionalString,
    ibkrFlexQueryId: nullableOptionalString,
    metadata: ImportProfileMetadataSchema.nullable().optional(),
    dayTagIds: idArrayField.default([]),
    tradeTagIds: idArrayField.default([]),
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
