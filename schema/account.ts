import { z } from 'zod';
import { CustomFieldSchema } from './symbol'
import { idField, dateOrStringField } from './primitives'

export const AccountSchema = z.object({
    id: idField,
    name: z.string().min(3).max(64),
    fullname: z.string().min(3).max(256),
    displayName: z.string().min(3).max(256),
    aliases: z.string().default('').transform((val) => {
        // Nettoyer les alias : split par virgule, trim chaque élément, filtrer les vides, rejoindre
        if (!val || val.trim() === '') return '';
        return val
            .split(',')
            .map(alias => alias.trim())
            .filter(alias => alias.length > 0)
            .join(', ');
    }),
    metadata: z.preprocess(
        val => {
            if (!val) return null;
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch {
                    return null;
                }
            }
            return val;
        },
        z.any().nullable().optional()
    ),
    createdAt: dateOrStringField,
})

export type AccountType = z.output<typeof AccountSchema>;

export const CreateAccountSchema = AccountSchema.omit({ id: true, createdAt: true, metadata: true }).extend({
    customFields: z.array(CustomFieldSchema).optional(),
});

export type CreateAccountType = z.output<typeof CreateAccountSchema>;

export const UpdateAccountSchema = AccountSchema.partial().required({ id: true }).omit({ createdAt: true, metadata: true }).extend({
    customFields: z.array(CustomFieldSchema).optional(),
});

export type UpdateAccountType = z.output<typeof UpdateAccountSchema>;
