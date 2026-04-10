import type { NoteType, CreateNoteType, UpdateNoteType } from '~/schema/note'
import { toISODate } from '~/utils/date-utils'

type SaveNoteResponse = { success: boolean; note: NoteType; message: string }

export const useNotes = () => {
    // Fetch all note dates
    const fetchNoteDates = async () => {
        return await $fetch('/api/notes', { method: 'GET' })
    }

    // Fetch a single note by date
    const fetchNote = async (date: string | Date) => {
        const dateStr = typeof date === 'string' ? date : toISODate(date)
        return await $fetch(`/api/notes?date=${dateStr}`, { method: 'GET' })
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

    return {
        fetchNoteDates,
        fetchNote,
        saveNote,
        deleteNote
    }
}
