import { z } from 'zod';
import { nameFormatRefine } from './index'

export const INSTRUMENT_TYPES = ['any', 'forex', 'future', 'stock', 'crypto', 'call', 'put'] as const
export type InstrumentType = typeof INSTRUMENT_TYPES[number]

export const DEFAULT_INSTRUMENT_TYPE_BY_PROVIDER: Record<string, InstrumentType> = {
    mt5: 'forex',
    nt8: 'future',
    quantower: 'future',
    ibkr: 'stock',
    'ibkr-api': 'stock',
    standard: 'any',
}

// Schéma pour les métadonnées du profil d'import
export const ImportProfileMetadataSchema = z.object({
    useCloudStorage: z.boolean().optional().default(false),
}).passthrough() // Permet d'autres propriétés non définies

/**
 * Schéma complet (lecture depuis l'API, avec relations Prisma)
 */
const tagRelationSchema = z.array(z.object({ tagId: z.number() })).default([]).transform((arr) => arr.map((t) => t.tagId))

export const ImportProfileSchema = z.object({
    id: z.number(),
    name: nameFormatRefine(z.string().min(3).max(64)),
    provider: z.string(),
    importMode: z.string().default('local'),
    timezone: z.string().default('Europe/Paris'),
    keepExistingTrades: z.boolean().default(false),
    instrumentType: z.string().default('any'),
    ibkrFlexQueryToken: z.string().nullable().optional(),
    ibkrFlexQueryId: z.string().nullable().optional(),
    metadata: ImportProfileMetadataSchema.nullable().optional(),
    dayTags: tagRelationSchema,
    tradeTags: tagRelationSchema,
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
})

/**
 * Type pour les sorties (après validation/transformation)
 */
export type ImportProfileType = z.output<typeof ImportProfileSchema>;

/**
 * Schéma pour la création d'un profil (sans ID, createdAt, updatedAt)
 */
export const CreateImportProfileSchema = z.object({
    name: nameFormatRefine(z.string().min(3).max(64)),
    provider: z.string(),
    importMode: z.string().default('local'),
    timezone: z.string().default('Europe/Paris'),
    keepExistingTrades: z.boolean().default(false),
    instrumentType: z.string().default('any'),
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

/**
 * Type pour la création d'un profil
 */
export type CreateImportProfileType = z.input<typeof CreateImportProfileSchema>;

/**
 * Schéma pour la mise à jour d'un profil (avec ID obligatoire)
 */
export const UpdateImportProfileSchema = z.object({
    id: z.number(),
    name: nameFormatRefine(z.string().min(3).max(64)),
    provider: z.string(),
    importMode: z.string().default('local'),
    timezone: z.string().default('Europe/Paris'),
    keepExistingTrades: z.boolean().default(false),
    instrumentType: z.string().default('any'),
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

/**
 * Type pour la mise à jour d'un profil
 */
export type UpdateImportProfileType = z.input<typeof UpdateImportProfileSchema>;
