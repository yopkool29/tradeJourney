import { z } from 'zod';

/**
 * Schéma de validation pour les symboles de trading configurés
 */
export const SymbolSchema = z.object({
    id: z.number(),
    symbol: z.string().min(2).transform(val => val.toUpperCase()),
    digit: z.preprocess((v) => typeof v === 'string' ? Number(v) : v, z.number().int().min(0).max(6)),
    active: z.boolean().default(true),
    notes: z.string().nullable(),
    pricePerPoint: z.preprocess((v) => typeof v === 'string' ? Number(v) : v, z.number().default(-1)),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date())
});

/**
 * Type pour les sorties (après validation/transformation)
 */
export type SymbolType = z.output<typeof SymbolSchema>;

/**
 * Schéma pour la création d'un symbole (sans ID, createdAt, updatedAt)
 */
export const CreateSymbolSchema = SymbolSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
}); // digit est bien conservé dans CreateSymbolSchema

/**
 * Type pour la création d'un symbole
 */
export type CreateSymbolType = z.output<typeof CreateSymbolSchema>;

/**
 * Schéma pour la mise à jour d'un symbole (avec ID obligatoire)
 */
export const UpdateSymbolSchema = SymbolSchema.partial().required({ id: true });

/**
 * Type pour la mise à jour d'un symbole
 */
export type UpdateSymbolType = z.output<typeof UpdateSymbolSchema>;
