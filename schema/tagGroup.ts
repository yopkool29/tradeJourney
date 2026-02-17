import { z } from 'zod'
import { TagSchema } from './tag'


const nameFormatRefine = (schema: z.ZodString) => schema.refine(val => /^[\p{L}\p{N}_]+$/u.test(val), {
    params: { i18n: 'zodI18n.validation.name_format' }
})

export const TagGroupSchema = z.object({
    id: z.number(),
    name: nameFormatRefine(z.string().min(3).max(64)),
    // name: z.string().min(3).max(64),
    tags: z.array(TagSchema).default([]),
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
