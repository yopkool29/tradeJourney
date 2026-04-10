import { z } from 'zod';

export const SymbolSchema = z.object({
    id: z.number(),
    symbol: z.string().min(1).transform(val => val.toUpperCase()),
    digit: z.preprocess((v) => typeof v === 'string' ? Number(v) : v, z.number().int().min(0).max(6)),
    active: z.boolean().default(true),
    notes: z.string().nullable(),
    aliases: z.string().default('').transform((val) => {
        // Nettoyer les alias : split par virgule, trim chaque élément, filtrer les vides, rejoindre
        if (!val || val.trim() === '') return '';
        return val
            .split(',')
            .map(alias => alias.trim())
            .filter(alias => alias.length > 0)
            .join(', ');
    }),
    pricePerPoint: z.preprocess((v) => typeof v === 'string' ? Number(v) : v, z.number().default(-1)),
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
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date())
});

export type SymbolType = z.output<typeof SymbolSchema>;

export const CreateSymbolSchema = SymbolSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
}); // digit est bien conservé dans CreateSymbolSchema

export type CreateSymbolType = z.output<typeof CreateSymbolSchema>;

export const UpdateSymbolSchema = SymbolSchema.partial().required({ id: true });

export type UpdateSymbolType = z.output<typeof UpdateSymbolSchema>;
