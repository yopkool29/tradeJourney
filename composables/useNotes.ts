import type { NoteType, CreateNoteType, UpdateNoteType } from '~/schema/note'
import type { InternalApi } from 'nitropack'

export const useNotes = () => {
    // Fetch all note dates
    const fetchNoteDates = async () => {
        return await $fetch('/api/notes', { method: 'GET' })
    }

    // Fetch a single note by date
    const fetchNote = async (date: string | Date) => {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
        return await $fetch<InternalApi['/api/notes']['get']>(`/api/notes?date=${dateStr}`, { method: 'GET' })
    }

    // Save a note (create or update)
    const saveNote = async (note: CreateNoteType | UpdateNoteType) => {
        return await $fetch<NoteType>('/api/notes', {
            method: 'POST',
            body: note
        })
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
