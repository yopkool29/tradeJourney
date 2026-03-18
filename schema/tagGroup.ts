import { z } from 'zod'
import { TagSchema } from './tag'
import { nameFormatRefine } from './index'

export const TagGroupSchema = z.object({
    id: z.number(),
    name: nameFormatRefine(z.string().min(3).max(64)),
    // name: z.string().min(3).max(64),
    tags: z.array(TagSchema).default([]),
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
})

// --- Typescript types ---
export type TagGroupType = z.output<typeof TagGroupSchema>

/**
 * Schéma pour la création d'un groupe de tags (sans ID et tags)
 */
export const CreateTagGroupSchema = TagGroupSchema.omit({ id: true, tags: true })

/**
 * Type pour la création d'un groupe de tags
 */
export type CreateTagGroupType = z.output<typeof CreateTagGroupSchema>

/**
 * Schéma pour la mise à jour d'un groupe de tags (avec ID obligatoire)
 */
export const UpdateTagGroupSchema = TagGroupSchema.partial().required({ id: true }).omit({ tags: true })

/**
 * Type pour la mise à jour d'un groupe de tags
 */
export type UpdateTagGroupType = z.output<typeof UpdateTagGroupSchema>
