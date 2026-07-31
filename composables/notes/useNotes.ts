import type { NoteType, CreateNoteType, UpdateNoteType } from '~/schema/note'
import { toISODate } from '~/utils/date-utils'

type SaveNoteResponse = { success: boolean; note: NoteType; message: string }

export const useNotes = () => {
    // Fetch all note dates
    const fetchNoteDates = async () => {
        return await $fetch('/api/notes', { method: 'GET' })
    }

    // Fetch all notes for a specific date
    const fetchNotesByDate = async (date: string | Date) => {
        const dateStr = typeof date === 'string' ? date : toISODate(date)
        return await $fetch(`/api/notes?date=${dateStr}`, { method: 'GET' }) as NoteType[]
    }

    // Save a note (create or update)
    const saveNote = async (note: CreateNoteType | UpdateNoteType) => {
        const response = await $fetch('/api/notes', {
            method: 'POST',
            body: note
        }) as SaveNoteResponse
        return response.note
    }

    // Delete a note by ID
    const deleteNote = async (id: number) => {
        return await $fetch(`/api/notes/${id}`, {
            method: 'DELETE'
        })
    }

    // Update a note by ID
    const updateNote = async (id: number, data: Partial<UpdateNoteType>) => {
        const response = await $fetch(`/api/notes/${id}`, {
            method: 'PATCH',
            body: data
        }) as SaveNoteResponse
        return response.note
    }

    return {
        fetchNoteDates,
        fetchNotesByDate,
        saveNote,
        updateNote,
        deleteNote
    }
}
