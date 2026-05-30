import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { CreateDayTagType, DayTagType, UpdateDayTagType } from '~/schema/dayTag'
import { acquireTestDatabase, releaseTestDatabase } from './utils/test-database'

describe('Database Integration - Day Tags CRUD', () => {
	let testDbId: number
	let createdDayTag: DayTagType | null = null

	beforeAll(async () => {
		const db = await acquireTestDatabase()
		testDbId = db.id
	}, 30000)

	afterAll(async () => {
		await releaseTestDatabase(testDbId)
	})

	it('should fetch empty day tags', async () => {
		const { fetchDayTags } = useDayTags()
		const result = await fetchDayTags()
		expect(Array.isArray(result)).toBe(true)
		expect(result.length).toBe(0)
	})

	it('should create a day tag', async () => {
		const { createDayTag } = useDayTags()
		const newDayTag: CreateDayTagType = {
			date: '2024-01-15',
			note: 'Test day tag note',
			tagIds: []
		}
		createdDayTag = await createDayTag(newDayTag)
		expect(createdDayTag).toBeDefined()
		expect(createdDayTag.id).toBeDefined()
		expect(createdDayTag.note).toBe('Test day tag note')
	})

	it('should fetch day tags and find the created one', async () => {
		const { fetchDayTags } = useDayTags()
		const result = await fetchDayTags()
		expect(result.length).toBeGreaterThan(0)
		const found = result.find(dt => dt.id === createdDayTag?.id)
		expect(found).toBeDefined()
	})

	it('should get day tag by date', async () => {
		const { getDayTagByDate } = useDayTags()
		const testDate = new Date('2024-01-15')
		const found = await getDayTagByDate(testDate)
		expect(found).toBeDefined()
		expect(found?.id).toBe(createdDayTag?.id)
	})

	it('should get day tag by date (not found)', async () => {
		const { getDayTagByDate } = useDayTags()
		const otherDate = new Date('2024-01-16')
		const found = await getDayTagByDate(otherDate)
		expect(found).toBeNull()
	})

	it('should update a day tag', async () => {
		const { updateDayTag } = useDayTags()
		if (!createdDayTag) {
			throw new Error('No day tag was created')
		}
		const updateData: UpdateDayTagType = {
			id: createdDayTag.id,
			note: 'Updated note',
			tagIds: []
		}
		const updated = await updateDayTag(updateData)
		expect(updated).toBeDefined()
		expect(updated.id).toBe(createdDayTag.id)
		expect(updated.note).toBe('Updated note')
		createdDayTag = updated
	})

	it('should delete a day tag', async () => {
		const { deleteDayTag, fetchDayTags } = useDayTags()
		if (!createdDayTag) {
			throw new Error('No day tag was created')
		}
		await deleteDayTag(createdDayTag.id)
		const result = await fetchDayTags()
		const found = result.find(dt => dt.id === createdDayTag?.id)
		expect(found).toBeUndefined()
	})
})
