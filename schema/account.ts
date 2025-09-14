import { z } from 'zod';

/**
 * Schéma de validation pour les comptes
 */
export const AccountSchema = z.object({
    id: z.number(),
    name: z.string().min(3),
    fullname: z.string().min(3),
    displayName: z.string().min(3),
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
