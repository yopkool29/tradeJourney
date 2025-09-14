import { z } from 'zod'

/**
 * Schéma de validation pour les tags
 */
export const TagSchema = z.object({
    id: z.number(),
    name: z.string().min(3).max(32),
    color: z.string().optional().nullable().transform((val) => val === null ? undefined : val),
    dark_fg_reverse: z.boolean().default(false),
    description: z.string().optional().refine(
        val => val === undefined || val === '' || val.length > 3,
        {
            params: { i18n: 'zodI18n.validation.tag.description_min' }
        }
    ),
})

/**
 * Type pour les sorties (après validation/transformation)
 */
export type TagType = z.output<typeof TagSchema>

/**
 * Schéma pour la création d'un tag (sans ID)
 */
export const CreateTagSchema = TagSchema.omit({ id: true })

/**
 * Type pour la création d'un tag
 */
export type CreateTagType = z.output<typeof CreateTagSchema>

/**
 * Schéma pour la mise à jour d'un tag (avec ID obligatoire)
 */
export const UpdateTagSchema = TagSchema.partial().required({ id: true })

/**
 * Type pour la mise à jour d'un tag
 */
export type UpdateTagType = z.output<typeof UpdateTagSchema>
