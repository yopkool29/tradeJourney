import { z } from 'zod'
import { TagSchema } from './tag'

/**
 * Schéma de validation pour les tags journaliers
 */
export const DayTagSchema = z.object({
    id: z.number(),
    date: z.string().or(z.date()),
    note: z.string().optional(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
    tags: z.array(TagSchema).default([]),
})

/**
 * Type pour les sorties (après validation/transformation)
 */
export type DayTagType = z.output<typeof DayTagSchema>


// Fonction de validation commune pour vérifier qu'il y a une note ou des tags
const validateNoteOrTags = (data: { note?: string; tagIds?: number[] }) => {
    return (data.note && data.note.trim().length > 0) || (data.tagIds && data.tagIds.length > 0)
}

/**
 * Schéma pour la création d'un tag journalier (sans ID, createdAt, updatedAt)
 */
export const CreateDayTagSchema = z.object({
    date: z.string().or(z.date()),
    note: z.string().optional(),
    tagIds: z.array(z.number()).default([])
}).refine(
    validateNoteOrTags,
    {
        params: { i18n: 'zodI18n.validation.dayTag.note_or_tags_required' },
        path: ["note"]
    }
)

/**
 * Type pour la création d'un tag journalier
 */
export type CreateDayTagType = z.output<typeof CreateDayTagSchema>

/**
 * Schéma pour la mise à jour d'un tag journalier
 */
export const UpdateDayTagSchema = z.object({
    id: z.number(),
    note: z.string().optional(),
    date: z.string().or(z.date()).optional(),
    tagIds: z.array(z.number()).default([]).optional()
}).refine(
    validateNoteOrTags,
    {
        params: { i18n: 'zodI18n.validation.dayTag.note_or_tags_required' },
        path: ["note"]
    }
)

/**
 * Type pour la mise à jour d'un tag journalier
 */
export type UpdateDayTagType = z.output<typeof UpdateDayTagSchema>

