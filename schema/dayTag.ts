import { z } from 'zod'
import { TagSchema } from './tag'
import { idField, dateOrStringField, nullableOptionalString, idArrayField } from './primitives'

export const DayTagSchema = z.object({
    id: idField,
    date: dateOrStringField,
    note: nullableOptionalString,
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
    updatedAt: dateOrStringField,
    tags: z.array(TagSchema).default([]),
})

export type DayTagType = z.output<typeof DayTagSchema>


// Fonction de validation commune pour vérifier qu'il y a une note ou des tags
const validateNoteOrTags = (data: { note?: string | null; tagIds?: number[] }) => {
    return (data.note && data.note.trim().length > 0) || (data.tagIds && data.tagIds.length > 0)
}

export const CreateDayTagSchema = z.object({
    date: dateOrStringField,
    note: z.preprocess(
        (val) => val === '' ? null : val,
        nullableOptionalString
    ),
    tagIds: idArrayField.default([])
}).refine(
    validateNoteOrTags,
    {
        params: { i18n: 'zodI18n.validation.dayTag.note_or_tags_required' },
        path: ["note"]
    }
)

export type CreateDayTagType = z.output<typeof CreateDayTagSchema>

export const UpdateDayTagSchema = z.object({
    id: idField,
    note: z.preprocess(
        (val) => val === '' ? null : val,
        nullableOptionalString
    ),
    date: dateOrStringField.optional(),
    tagIds: idArrayField.default([]).optional()
}).refine(
    validateNoteOrTags,
    {
        params: { i18n: 'zodI18n.validation.dayTag.note_or_tags_required' },
        path: ["note"]
    }
)

export type UpdateDayTagType = z.output<typeof UpdateDayTagSchema>

