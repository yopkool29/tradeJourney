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

	it('should fetch notes with a bounded date range and pagination', async () => {
		const result = await $fetch(`/api/notes?date_from=${encodeURIComponent('2024-01-15T00:00:00.000Z')}&date_to=${encodeURIComponent('2024-01-15T23:59:59.999Z')}&limit=1&offset=0`) as NoteType[]
		expect(result).toHaveLength(1)
		expect(result[0].id).toBe(createdNote?.id)
	})

	it('should fetch note dates and find our date', async () => {
		const { fetchNoteDates } = useNotes()
		const result = await fetchNoteDates() as Array<{ date: string }>
		expect(Array.isArray(result)).toBe(true)
		expect(result.length).toBeGreaterThan(0)
		const dates = result.map((note) => note.date.split('T')[0])
		expect(dates).toContain(testDate)
	})

	it('should append AI analyses to one reserved MCP journal note', async () => {
		const first = await $fetch('/api/mcp/ai-journal', {
			method: 'POST',
			body: { title: 'First analysis', content: 'Bullish context.' },
		}) as { note: NoteType }
		const second = await $fetch('/api/mcp/ai-journal', {
			method: 'POST',
			body: { title: 'Second analysis', content: 'Bearish invalidation.' },
		}) as { note: NoteType }

		expect(second.note.id).toBe(first.note.id)
		const notes = await $fetch('/api/notes?date=1980-01-01') as NoteType[]
		const journals = notes.filter(note => new Date(note.date).getTime() === Date.UTC(1980, 0, 1))
		expect(journals).toHaveLength(1)
		expect(journals[0].content).toContain('# Journal des analyses IA')
		expect(journals[0].content).toContain('## First analysis')
		expect(journals[0].content).toContain('Bullish context.')
		expect(journals[0].content).toContain('---')
		expect(journals[0].content).toContain('## Second analysis')
		expect(journals[0].content).toContain('Bearish invalidation.')

		const { updateNote } = useNotes()
		const manuallyUpdated = await updateNote(first.note.id, {
			date: first.note.date,
			content: `${journals[0].content}\n\nManual edit.`,
			subtitle: 'Analyse IA',
		})
		expect(manuallyUpdated.content).toContain('Manual edit.')
		expect(manuallyUpdated.metadata).toEqual({ subtitle: 'Analyse IA' })
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
