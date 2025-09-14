import { z } from 'zod'

export const NoteSchema = z.object({
    id: z.number(),
    date: z.string().or(z.date()),
    content: z.string().optional(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
})

export type NoteType = z.output<typeof NoteSchema>

export const CreateNoteSchema = NoteSchema.omit({ id: true, updatedAt: true })

export type CreateNoteType = z.output<typeof CreateNoteSchema>

export const UpdateNoteSchema = NoteSchema.omit({ id: true, updatedAt: true }).partial()

export type UpdateNoteType = z.output<typeof UpdateNoteSchema>

