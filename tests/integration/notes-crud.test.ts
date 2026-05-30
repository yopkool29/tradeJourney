import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { CreateNoteType, NoteType, UpdateNoteType } from '~/schema/note'
import { acquireTestDatabase, releaseTestDatabase } from './utils/test-database'

describe('Database Integration - Notes CRUD', () => {
	let testDbId: number
	let createdNote: NoteType | null = null
	const testDate = '2024-01-15'

	beforeAll(async () => {
		const db = await acquireTestDatabase()
		testDbId = db.id
	}, 30000)

	afterAll(async () => {
		await releaseTestDatabase(testDbId)
	})

	it('should fetch empty note dates', async () => {
		const { fetchNoteDates } = useNotes()
		const result = await fetchNoteDates()
		expect(Array.isArray(result)).toBe(true)
	})

	it('should create a note', async () => {
		const { saveNote } = useNotes()
		const newNote: CreateNoteType = {
			date: testDate,
			content: 'Test note content for integration test',
			createdAt: new Date().toISOString()
		}
		createdNote = await saveNote(newNote)
		expect(createdNote).toBeDefined()
		expect(createdNote.id).toBeDefined()
		expect(createdNote.content).toBe(newNote.content)
		expect(createdNote.date).toBeDefined()
	})

	it('should fetch notes by date', async () => {
		const { fetchNotesByDate } = useNotes()
		const result = await fetchNotesByDate(testDate)
		expect(Array.isArray(result)).toBe(true)
		expect(result.length).toBeGreaterThan(0)
		const found = result.find(n => n.id === createdNote?.id)
		expect(found).toBeDefined()
		expect(found?.content).toBe(createdNote?.content)
	})

	it('should fetch note dates and find our date', async () => {
		const { fetchNoteDates } = useNotes()
		const result = await fetchNoteDates() as Array<{ date: string }>
		expect(Array.isArray(result)).toBe(true)
		expect(result.length).toBeGreaterThan(0)
		const dates = result.map((note) => note.date.split('T')[0])
		expect(dates).toContain(testDate)
	})

	it('should update a note', async () => {
		const { updateNote } = useNotes()
		if (!createdNote) {
			throw new Error('No note was created')
		}
		const updateData: UpdateNoteType = {
			content: 'Updated note content'
		}
		const updated = await updateNote(createdNote.id, updateData)
		expect(updated).toBeDefined()
		expect(updated.id).toBe(createdNote.id)
		expect(updated.content).toBe('Updated note content')
		createdNote = updated
	})

	it('should delete a note', async () => {
		const { deleteNote, fetchNotesByDate } = useNotes()
		if (!createdNote) {
			throw new Error('No note was created')
		}
		await deleteNote(createdNote.id)
		const result = await fetchNotesByDate(testDate)
		const found = result.find(n => n.id === createdNote?.id)
		expect(found).toBeUndefined()
	})
})
