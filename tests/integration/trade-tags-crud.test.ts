import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { CreateAccountType, AccountType } from '~/schema/account'
import type { CreateTradeType, TradeType } from '~/schema/trade'
import type { CreateTagGroupType, TagGroupType } from '~/schema/tagGroup'
import type { CreateTagType, TagType } from '~/schema/tag'
import { InstrumentType } from '~/type'
import { acquireTestDatabase, releaseTestDatabase } from './utils/test-database'

describe('Database Integration - Trade Tags CRUD', () => {
	let testDbId: number
	let testAccount: AccountType | null = null
	let createdTrade: TradeType | null = null
	let createdGroup: TagGroupType | null = null
	let createdTag: TagType | null = null

	beforeAll(async () => {
		const db = await acquireTestDatabase()
		testDbId = db.id
	}, 30000)

	afterAll(async () => {
		await releaseTestDatabase(testDbId)
	})

	it('should create a test account', async () => {
		const { createAccount } = useAccount()
		const newAccount: CreateAccountType = {
			name: `test_account_${Date.now()}`,
			fullname: 'Test Account',
			displayName: 'Test Account',
			aliases: ''
		}
		testAccount = await createAccount(newAccount)
		expect(testAccount).toBeDefined()
		expect(testAccount.id).toBeDefined()
	})

	it('should create a trade', async () => {
		const { createTrade } = useTrades()
		if (!testAccount) {
			throw new Error('No test account was created')
		}
		const newTrade: CreateTradeType = {
			openDate: new Date('2024-01-15T10:00:00Z'),
			closeDate: new Date('2024-01-15T11:00:00Z'),
			symbol: 'TEST_SYMBOL',
			type: 'buy',
			lot: 1.0,
			openPrice: 100.0,
			closePrice: 101.0,
			profit: 100.0,
			netProfit: 95.0,
			profit_points: 1.0,
			instrumentType: InstrumentType.Stock,
			stopLoss: 99.0,
			takeProfit: 102.0,
			commission: 5.0,
			exchange: 0,
			note: 'Test trade for tags',
			active: true,
			accountId: testAccount.id,
			screenshots: []
		}
		createdTrade = await createTrade(newTrade)
		expect(createdTrade).toBeDefined()
		expect(createdTrade.id).toBeDefined()
	})

	it('should create a tag group and tag', async () => {
		const { createGroup, createTag } = useTags()
		const newGroup: CreateTagGroupType = {
			name: `test_group_${Date.now()}`
		}
		createdGroup = await createGroup(newGroup)
		expect(createdGroup).toBeDefined()
		expect(createdGroup.id).toBeDefined()

		const newTag: CreateTagType = {
			name: `test_tag_${Date.now()}`,
			color: '#ff0000',
			dark_fg_reverse: false,
			description: 'Test tag description'
		}
		createdTag = await createTag(createdGroup.id, newTag)
		expect(createdTag).toBeDefined()
		expect(createdTag.id).toBeDefined()
	})

	it('should associate tags to a trade', async () => {
		const { updateTradeTags } = useTradeTags()
		if (!createdTrade || !createdTag) {
			throw new Error('No trade or tag was created')
		}
		const result = await updateTradeTags(createdTrade.id, {
			tagIds: [createdTag.id]
		})
		expect(Array.isArray(result)).toBe(true)
		expect(result.length).toBe(1)
		expect(result[0].tagId).toBe(createdTag.id)
		expect(result[0].tradeId).toBe(createdTrade.id)
	})

	it('should get trade tags by trade id', async () => {
		const { getTradeTagsByTradeId } = useTradeTags()
		if (!createdTrade) {
			throw new Error('No trade was created')
		}
		const result = await getTradeTagsByTradeId(createdTrade.id)
		expect(Array.isArray(result)).toBe(true)
		expect(result.length).toBe(1)
		expect(result[0].tagId).toBe(createdTag?.id)
	})

	it('should update trade tags', async () => {
		const { updateTradeTags } = useTradeTags()
		if (!createdTrade) {
			throw new Error('No trade was created')
		}
		const result = await updateTradeTags(createdTrade.id, {
			tagIds: []
		})
		expect(Array.isArray(result)).toBe(true)
		expect(result.length).toBe(0)
	})

	it('should delete all trade tags', async () => {
		const { deleteTradeTags, getTradeTagsByTradeId } = useTradeTags()
		if (!createdTrade) {
			throw new Error('No trade was created')
		}
		await deleteTradeTags(createdTrade.id)
		const result = await getTradeTagsByTradeId(createdTrade.id)
		expect(Array.isArray(result)).toBe(true)
		expect(result.length).toBe(0)
	})
})
