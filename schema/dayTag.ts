import { z } from 'zod'
import { TagSchema } from './tag'

export const DayTagSchema = z.object({
    id: z.number(),
    date: z.string().or(z.date()),
    note: z.string().optional(),
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
    updatedAt: z.string().or(z.date()),
    tags: z.array(TagSchema).default([]),
})

export type DayTagType = z.output<typeof DayTagSchema>


// Fonction de validation commune pour vérifier qu'il y a une note ou des tags
const validateNoteOrTags = (data: { note?: string; tagIds?: number[] }) => {
    return (data.note && data.note.trim().length > 0) || (data.tagIds && data.tagIds.length > 0)
}

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

export type CreateDayTagType = z.output<typeof CreateDayTagSchema>

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

export type UpdateDayTagType = z.output<typeof UpdateDayTagSchema>

