import { z } from 'zod';
import { TagSchema } from './tag'
/**
 * Schéma de validation pour les trades
 */
export const TradeSchema = z.object({
    // Champs obligatoires
    id: z.number(),
    openDate: (z.string().or(z.date())).transform(val => new Date(val)),
    closeDate: (z.string().or(z.date())).transform(val => new Date(val)),
    symbol: z.string().refine(val => val.length >= 1, {
        params: { i18n: 'zodI18n.validation.trade.symbol_required' }
    }),
    active: z.boolean().default(true),

    type: z.enum(['buy', 'sell']).refine(val => val === 'buy' || val === 'sell', {
        params: { i18n: 'zodI18n.validation.trade.type_invalid' }
    }),
    lot: z.preprocess(
        val => typeof val === 'string' && val.trim() !== '' ? Number(val) : val,
        z.number({
            invalid_type_error: "zodI18n.validation.trade.lot_invalid",
            required_error: "zodI18n.validation.trade.lot_required"
        }).refine(val => val > 0, {
            params: { i18n: 'zodI18n.validation.trade.lot_positive' }
        })
    ),
    openPrice: z.preprocess(
        val => typeof val === 'string' && val.trim() !== '' ? Number(val) : val,
        z.number({
            invalid_type_error: "zodI18n.validation.trade.open_price_invalid",
            required_error: "zodI18n.validation.trade.open_price_required"
        }).refine(val => val > 0, {
            params: { i18n: 'zodI18n.validation.trade.open_price_positive' }
        })
    ),
    closePrice: z.preprocess(
        val => typeof val === 'string' && val.trim() !== '' ? Number(val) : val,
        z.number({
            invalid_type_error: "zodI18n.validation.trade.close_price_invalid",
            required_error: "zodI18n.validation.trade.close_price_required"
        }).refine(val => val > 0, {
            params: { i18n: 'zodI18n.validation.trade.close_price_positive' }
        })
    ),
    profit: z.preprocess(
        val => {
            if (typeof val === 'string') {
                if (val.trim() === '') return undefined;
                // Vérifie si le nombre a plus de 2 décimales
                if (val.includes('.') && val.split('.')[1].length > 2) {
                    throw new Error('zodI18n.validation.trade.profit_decimal_limit');
                }
                return Number(val);
            }
            return val;
        },
        z.number({
            invalid_type_error: "zodI18n.validation.trade.profit_invalid",
            required_error: "zodI18n.validation.trade.profit_required"
        })
            .refine(val => {
                // Vérifie si le nombre a plus de 2 décimales après conversion
                const decimalPart = String(val).split('.')[1];
                return !decimalPart || decimalPart.length <= 2;
            }, {
                params: { i18n: 'zodI18n.validation.trade.profit_decimal_limit' }
            })
    ),

    profit_points: z.number().default(0),

    // Champs optionnels avec valeurs par défaut
    stopLoss: z.number().optional().default(0),
    takeProfit: z.number().optional().default(0),
    commission: z.number().optional().default(0),
    exchange: z.number().optional().default(0),

    screenshotUrl: z.string().nullable().optional(), // Garder pour compatibilité
    screenshots: z.array(z.object({
        id: z.number().optional(),
        url: z.string()
    })).optional().default([]),

    note: z.string().nullable().optional(),

    accountId: z.number({ required_error: "zodI18n.validation.trade.account_id_required" })
        .int()
        .refine(val => val > 0, {
            params: { i18n: 'zodI18n.validation.trade.account_id_positive' }
        }),
});

export function generateUniqueId(accountId: number, symbol: string, openDate: string | Date, closeDate: string | Date, id?: string): string {
    const open = typeof openDate === 'string' ? new Date(openDate) : openDate
    const close = typeof closeDate === 'string' ? new Date(closeDate) : closeDate
    return id ? `${accountId}${symbol}${open.getTime()}${close.getTime()}${id}` : `${accountId}${symbol}${open.getTime()}${close.getTime()}`
}

// Utilitaire pour déterminer dynamiquement le type d'une colonne
const tradeFieldTypes = TradeSchema.shape

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBaseZodType(field: any): any {
    // Déplie les transforms (ZodEffects)
    while (field && field._def && field._def.schema) {
        field = field._def.schema
    }
    return field
}

export function getColumnType(column: string): 'number' | 'string' | 'date' {
    if (!(column in tradeFieldTypes)) return 'string'
    let field = tradeFieldTypes[column as keyof typeof tradeFieldTypes]
    field = getBaseZodType(field)
    if (field instanceof z.ZodNumber) return 'number'
    if (field instanceof z.ZodDate) return 'date'
    if (field instanceof z.ZodUnion && field.options.some((opt: z.ZodTypeAny) => opt instanceof z.ZodDate)) return 'date'
    return 'string'
}

/**
 * Type de Trade pour les sorties (après validation/transformation)
 * Utilisé principalement dans l'application pour manipuler les données
 */
export type TradeType = z.output<typeof TradeSchema>;

/**
 * Schéma pour la création d'un trade (sans ID)
 */
export const CreateTradeSchema = TradeSchema.omit({ id: true });

/**
 * Type pour la création d'un trade (sans ID)
 */
export type CreateTradeType = z.output<typeof CreateTradeSchema>;

/**
 * Schéma pour la mise à jour d'un trade (avec ID obligatoire)
 */
export const UpdateTradeSchema = TradeSchema.partial().required({ id: true });

/**
 * Type pour la mise à jour d'un trade (avec ID obligatoire)
 */
export type UpdateTradeType = z.output<typeof UpdateTradeSchema>;

/**
 * Type pour la réponse de l'import
 */
export type ImportTypeResult = { success: boolean, message: string, countUpdated: number, countDiscard: number }


export type DeleteAccountTradesResult = { message: string, count: number }

/**
 * Schéma pour la création/mise à jour des tags de trade
 */
export const UpdateTradeTagsSchema = z.object({
    tagIds: z.array(z.number())
});

/**
 * Type pour la création/mise à jour des tags de trade
 */
export type UpdateTradeExtendedType = z.output<typeof UpdateTradeTagsSchema>;


// Fonction de validation commune pour vérifier qu'il y a une note ou des tags
const validateNoteOrTags = (data: { note?: string | null; tagIds?: number[] }) => {
    return (data.note && data.note.trim().length > 0) || (data.tagIds && data.tagIds.length > 0)
}

export const NoteTagIdsSchema = z.object({
    idTrade: z.number(),
    note: z.string(),
    tagIds: z.array(z.number())
}).refine(
    validateNoteOrTags,
    {
        params: { i18n: 'zodI18n.validation.trade.note_or_tags_required' },
        path: ["note"]
    }
)

export type NoteTagIdsType = z.infer<typeof NoteTagIdsSchema>

export const TradeExtendedShema = TradeSchema.extend({
    tags: z.array(TagSchema),
    account_displayName: z.string()
})

export type TradeExtendedType = z.infer<typeof TradeExtendedShema>

/**
 * Schéma pour l'association entre un trade et un tag
 */
export const TradeTagAssociationSchema = z.object({
    tradeId: z.number(),
    tagId: z.number(),
    tag: TagSchema
})

/**
 * Type pour les associations entre trades et tags
 */
export type TradeTagAssociationType = z.infer<typeof TradeTagAssociationSchema>