import { z } from 'zod'
import { idField, dateOrStringField } from './primitives'

export const KnownNoteMetadataSchema = z.object({
    subtitle: z.string().optional(),
}).strip()

export const NoteSchema = z.object({
    id: idField,
    date: dateOrStringField,
    content: z.string().optional(),
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
})

export type NoteType = z.output<typeof NoteSchema>

export const CreateNoteSchema = NoteSchema.omit({ id: true, updatedAt: true })

export type CreateNoteType = z.output<typeof CreateNoteSchema>

export const UpdateNoteSchema = NoteSchema.omit({ id: true, updatedAt: true }).partial()

export type UpdateNoteType = z.output<typeof UpdateNoteSchema>

