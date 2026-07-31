import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { CreateTagGroupType, TagGroupType, UpdateTagGroupType } from '~/schema/tagGroup'
import type { CreateTagType, UpdateTagType, TagType } from '~/schema/tag'
import { acquireTestDatabase, releaseTestDatabase } from './utils/test-database'

describe('Database Integration - Tags CRUD', () => {
	let testDbId: number
	let createdGroup: TagGroupType | null = null
	let createdTag: TagType | null = null

	beforeAll(async () => {
		const db = await acquireTestDatabase()
		testDbId = db.id
	}, 30000)

	afterAll(async () => {
		await releaseTestDatabase(testDbId)
	})

	it('should fetch empty tag groups', async () => {
		const { fetchGroups, tagGroups } = useTags()
		await fetchGroups()
		expect(Array.isArray(tagGroups.value)).toBe(true)
		expect(tagGroups.value.length).toBe(0)
	})

	it('should create a tag group', async () => {
		const { createGroup } = useTags()
		const newGroup: CreateTagGroupType = {
			name: `test_group_${Date.now()}`
		}
		createdGroup = await createGroup(newGroup)
		expect(createdGroup).toBeDefined()
		expect(createdGroup.id).toBeDefined()
		expect(createdGroup.name).toBe(newGroup.name)
		expect(Array.isArray(createdGroup.tags)).toBe(true)
		expect(createdGroup.tags.length).toBe(0)
	})

	it('should update a tag group', async () => {
		const { updateGroup } = useTags()
		if (!createdGroup) {
			throw new Error('No group was created')
		}
		const updateData: UpdateTagGroupType = {
			id: createdGroup.id,
			name: `updated_group_${Date.now()}`
		}
		const updated = await updateGroup(updateData)
		expect(updated).toBeDefined()
		expect(updated.id).toBe(createdGroup.id)
		expect(updated.name).toBe(updateData.name)
		createdGroup = updated
	})

	it('should create a tag in the group', async () => {
		const { createTag } = useTags()
		if (!createdGroup) {
			throw new Error('No group was created')
		}
		const newTag: CreateTagType = {
			name: `test_tag_${Date.now()}`,
			color: '#ff0000',
			dark_fg_reverse: true,
			description: 'Test tag description'
		}
		createdTag = await createTag(createdGroup.id, newTag)
		expect(createdTag).toBeDefined()
		expect(createdTag.id).toBeDefined()
		expect(createdTag.name).toBe(newTag.name)
		expect(createdTag.color).toBe(newTag.color)
		expect(createdTag.dark_fg_reverse).toBe(true)
	})

	it('should update a tag', async () => {
		const { updateTag } = useTags()
		if (!createdGroup || !createdTag) {
			throw new Error('No group or tag was created')
		}
		const updateData: UpdateTagType = {
			id: createdTag.id,
			name: `updated_tag_${Date.now()}`,
			color: '#00ff00'
		}
		const updated = await updateTag(createdGroup.id, createdTag.id, updateData)
		expect(updated).toBeDefined()
		expect(updated.id).toBe(createdTag.id)
		expect(updated.name).toBe(updateData.name)
		expect(updated.color).toBe(updateData.color)
		createdTag = updated
	})

	it('should get tag style correctly', () => {
		const { getTagStyle } = useTags()
		if (!createdTag) {
			throw new Error('No tag was created')
		}
		const style = getTagStyle(createdTag)
		expect(style.backgroundColor).toBe(createdTag.color)
		expect(style.color).toBe('#fff')

		const styleNoReverse = getTagStyle({ color: '#ff0000', dark_fg_reverse: false })
		expect(styleNoReverse.color).toBeUndefined()

		const styleDefaultColor = getTagStyle({})
		expect(styleDefaultColor.backgroundColor).toBe('#333')
	})

	it('should fetch groups and find our group with tag', async () => {
		const { fetchGroups, tagGroups } = useTags()
		await fetchGroups()
		expect(tagGroups.value.length).toBeGreaterThan(0)
		const foundGroup = tagGroups.value.find(g => g.id === createdGroup?.id)
		expect(foundGroup).toBeDefined()
		expect(foundGroup?.tags.length).toBeGreaterThan(0)
		const foundTag = foundGroup?.tags.find(t => t.id === createdTag?.id)
		expect(foundTag).toBeDefined()
	})

	it('should delete a tag', async () => {
		const { deleteTag, fetchGroups } = useTags()
		if (!createdGroup || !createdTag) {
			throw new Error('No group or tag was created')
		}
		await deleteTag(createdGroup.id, createdTag.id)
		await fetchGroups()
		const _foundGroup = (await useTags().tagGroups.value).find(g => g.id === createdGroup?.id)
		// Re-fetch groups properly
		const { tagGroups } = useTags()
		await fetchGroups()
		const group = tagGroups.value.find(g => g.id === createdGroup?.id)
		expect(group).toBeDefined()
		const foundTag = group?.tags.find(t => t.id === createdTag?.id)
		expect(foundTag).toBeUndefined()
	})

	it('should delete a tag group', async () => {
		const { deleteGroup, fetchGroups, tagGroups } = useTags()
		if (!createdGroup) {
			throw new Error('No group was created')
		}
		await deleteGroup(createdGroup.id)
		await fetchGroups()
		const found = tagGroups.value.find(g => g.id === createdGroup?.id)
		expect(found).toBeUndefined()
	})
})
