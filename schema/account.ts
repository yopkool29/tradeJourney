import { z } from 'zod';

/**
 * Schéma de validation pour les comptes
 */

const nameFormatRefine = (schema: z.ZodString) => schema.refine(val => /^[\p{L}\p{N}_]+$/u.test(val), {
    params: { i18n: 'zodI18n.validation.name_format' }
})

export const AccountSchema = z.object({
    id: z.number(),
    name: z.string().min(3).max(64),
    fullname: z.string().min(3),
    displayName: z.string().min(3),
    aliases: z.string().default('').transform((val) => {
        // Nettoyer les alias : split par virgule, trim chaque élément, filtrer les vides, rejoindre
        if (!val || val.trim() === '') return '';
        return val
            .split(',')
            .map(alias => alias.trim())
            .filter(alias => alias.length > 0)
            .join(', ');
    }),
    createdAt: z.string().or(z.date()),
})

/**
 * Type pour les sorties (après validation/transformation)
 */
export type AccountType = z.output<typeof AccountSchema>;

/**
 * Schéma pour la création d'un compte (sans ID, createdAt)
 */
export const CreateAccountSchema = AccountSchema.omit({ id: true, createdAt: true });

/**
 * Type pour la création d'un compte
 */
export type CreateAccountType = z.output<typeof CreateAccountSchema>;

/**
 * Schéma pour la mise à jour d'un compte (avec ID obligatoire)
 */
export const UpdateAccountSchema = AccountSchema.partial().required({ id: true }).omit({ createdAt: true });

/**
 * Type pour la mise à jour d'un compte
 */
export type UpdateAccountType = z.output<typeof UpdateAccountSchema>;
