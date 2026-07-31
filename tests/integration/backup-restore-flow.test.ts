import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Database } from '~/composables/data/useDatabase'
import type { CreateAccountType } from '~/schema/account'
import type { CreateTradeType } from '~/schema/trade'
import type { CreateTagGroupType } from '~/schema/tagGroup'
import type { CreateTagType } from '~/schema/tag'
import type { CreateNoteType } from '~/schema/note'
import { InstrumentType } from '~/type'
import {
	checkServerRunning,
	loginTestUser,
	generateTestDbName,
	cleanupOldTestDatabases,
	deleteTestDatabase,
	updateSessionCookie,
	getSessionCookie,
	BASE_URL
} from './utils/test-helpers'

describe('Database Integration - Backup Restore Flow', () => {
	let sourceDbName: string
	let sourceDbId: number
	let destDbName: string
	let destDbId: number
	let testAccountId: number
	let testTradeId: number
	let testTagId: number
	let testNoteId: number
	let backupFileName: string
	let backupBlob: Blob

	beforeAll(async () => {
		await checkServerRunning()
		const loginResult = await loginTestUser()
		const userStore = useUserStore()
		userStore.setUser(loginResult)
		await cleanupOldTestDatabases()
	}, 30000)

	afterAll(async () => {
		await deleteTestDatabase(sourceDbId)
		await deleteTestDatabase(destDbId)
	})

	it('should create source database with data', async () => {
		const { createDatabase } = useDatabase()

		// Create source database
		sourceDbName = generateTestDbName()
		const result = await createDatabase(sourceDbName, `Source DB ${sourceDbName}`) as Database
		expect(result).toBeDefined()
		expect(result.name).toBe(sourceDbName)
		expect(result.id).toBeDefined()
		sourceDbId = result.id

		// Select source database
		const selectResp = await $fetch.raw(`${BASE_URL}/api/database/select`, {
			method: 'POST',
			body: { databaseId: sourceDbId }
		})
		const newCookie = selectResp.headers.get('set-cookie')
		if (newCookie) {
			updateSessionCookie(newCookie.split(';')[0])
		}
		console.log('Waiting for database schema to be ready...')
		await new Promise(r => setTimeout(r, 5000))
		const { fetchGroups } = useTags()
		await fetchGroups()

		// Create account
		const { createAccount } = useAccount()
		const newAccount: CreateAccountType = {
			name: `test_account_${Date.now()}`,
			fullname: 'Test Account',
			displayName: 'Test Account',
			aliases: ''
		}
		const account = await createAccount(newAccount)
		testAccountId = account.id
		expect(testAccountId).toBeDefined()

		// Create trade
		const { createTrade } = useTrades()
		const newTrade: CreateTradeType = {
			openDate: new Date('2024-01-15T10:00:00Z'),
			closeDate: new Date('2024-01-15T11:00:00Z'),
			symbol: 'AAPL',
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
			note: 'Trade for backup test',
			active: true,
			accountId: testAccountId,
			screenshots: []
		}
		const trade = await createTrade(newTrade)
		testTradeId = trade.id
		expect(testTradeId).toBeDefined()

		// Create tag group and tag
		const { createGroup, createTag } = useTags()
		const newGroup: CreateTagGroupType = {
			name: `test_group_${Date.now()}`
		}
		const group = await createGroup(newGroup)
		const newTag: CreateTagType = {
			name: `test_tag_${Date.now()}`,
			color: '#ff0000',
			dark_fg_reverse: false,
			description: 'Test tag for backup'
		}
		const tag = await createTag(group.id, newTag)
		testTagId = tag.id
		expect(testTagId).toBeDefined()

		// Associate tag to trade
		const { updateTradeTags } = useTradeTags()
		await updateTradeTags(testTradeId, { tagIds: [testTagId] })

		// Create note
		const { saveNote } = useNotes()
		const newNote: CreateNoteType = {
			date: '2024-01-15',
			content: 'Note for backup test',
			createdAt: new Date().toISOString()
		}
		const note = await saveNote(newNote)
		testNoteId = note.id
		expect(testNoteId).toBeDefined()

		console.log('Source database created with:', { accountId: testAccountId, tradeId: testTradeId, tagId: testTagId, noteId: testNoteId })
	}, 30000)

	it('should create backup from source database', async () => {
		// Select source database first
		const selectResp = await $fetch.raw(`${BASE_URL}/api/database/select`, {
			method: 'POST',
			body: { databaseId: sourceDbId }
		})
		const newCookie = selectResp.headers.get('set-cookie')
		if (newCookie) {
			updateSessionCookie(newCookie.split(';')[0])
		}

		// Create backup
		const result = await $fetch('/api/backup', { method: 'GET' }) as { success: boolean; downloadUrl: string; filename: string }
		expect(result.success).toBe(true)
		expect(result.downloadUrl).toBeDefined()
		expect(result.filename).toBeDefined()
		backupFileName = result.filename
		console.log('Backup created:', backupFileName)

		// Download backup file using native fetch for binary data
		const downloadResp = await fetch(`${BASE_URL}${result.downloadUrl}`, {
			headers: { cookie: getSessionCookie() }
		})
		expect(downloadResp.ok).toBe(true)
		const arrayBuffer = await downloadResp.arrayBuffer()
		expect(arrayBuffer.byteLength).toBeGreaterThan(0)
		backupBlob = new Blob([arrayBuffer], { type: 'application/zip' })
	}, 15000)

	it('should create destination database and restore backup', async () => {
		const { createDatabase } = useDatabase()

		// Create destination database
		destDbName = generateTestDbName()
		const result = await createDatabase(destDbName, `Dest DB ${destDbName}`) as Database
		expect(result).toBeDefined()
		expect(result.name).toBe(destDbName)
		expect(result.id).toBeDefined()
		destDbId = result.id

		// Select destination database
		const selectResp = await $fetch.raw(`${BASE_URL}/api/database/select`, {
			method: 'POST',
			body: { databaseId: destDbId }
		})
		const newCookie = selectResp.headers.get('set-cookie')
		if (newCookie) {
			updateSessionCookie(newCookie.split(';')[0])
		}

		// Wait for schema initialization
		console.log('Waiting for destination database schema...')
		await new Promise(r => setTimeout(r, 15000))

		// Restore backup with manual multipart body (happy-dom FormData is not compatible with node fetch)
		const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
		const blobBytes = new Uint8Array(await backupBlob.arrayBuffer())

		const encoder = new TextEncoder()
		const header = encoder.encode(
			`--${boundary}\r\n` +
			`Content-Disposition: form-data; name="backup"; filename="${backupFileName}"\r\n` +
			`Content-Type: application/zip\r\n\r\n`
		)
		const footer = encoder.encode(`\r\n--${boundary}--\r\n`)

		const body = new Uint8Array(header.length + blobBytes.length + footer.length)
		body.set(header, 0)
		body.set(blobBytes, header.length)
		body.set(footer, header.length + blobBytes.length)

		const restoreResponse = await fetch(`${BASE_URL}/api/backup`, {
			method: 'POST',
			headers: {
				cookie: getSessionCookie(),
				'Content-Type': `multipart/form-data; boundary=${boundary}`
			},
			body
		})
		console.log('Restore response status:', restoreResponse.status, restoreResponse.statusText)
		const restoreResult = await restoreResponse.json()
		console.log('Restore response body:', JSON.stringify(restoreResult))
		expect(restoreResult.success).toBe(true)
		console.log('Backup restored to destination database')
	}, 30000)

	it('should verify account restored', async () => {
		const { fetchAccounts } = useAccount()
		const accounts = await fetchAccounts()
		expect(accounts.length).toBeGreaterThan(0)
		const found = accounts.find(a => a.name.includes('test_account_'))
		expect(found).toBeDefined()
		expect(found?.fullname).toBe('Test Account')
	})

	it('should verify trade restored', async () => {
		const { fetchTrades } = useTrades()
		const trades = await fetchTrades({ symbol: 'AAPL' }, 100)
		expect(trades.length).toBeGreaterThan(0)
		const found = trades.find(t => t.symbol === 'AAPL' && t.note === 'Trade for backup test')
		expect(found).toBeDefined()
	})

	it('should verify tag restored', async () => {
		const { fetchGroups } = useTags()
		const groups = await fetchGroups()
		expect(groups.length).toBeGreaterThan(0)
		const foundGroup = groups.find(g => g.tags.some(t => t.name.includes('test_tag_')))
		expect(foundGroup).toBeDefined()
		const foundTag = foundGroup?.tags.find(t => t.name.includes('test_tag_'))
		expect(foundTag).toBeDefined()
		expect(foundTag?.color).toBe('#ff0000')
	})

	it('should verify trade-tag association restored', async () => {
		const { fetchTrades } = useTrades()
		const trades = await fetchTrades({ symbol: 'AAPL' }, 100)
		const trade = trades.find(t => t.note === 'Trade for backup test')
		expect(trade).toBeDefined()

		const { getTradeTagsByTradeId } = useTradeTags()
		const associations = await getTradeTagsByTradeId(trade!.id)
		expect(associations.length).toBeGreaterThan(0)
	})

	it('should verify note restored', async () => {
		const { fetchNotesByDate } = useNotes()
		const notes = await fetchNotesByDate('2024-01-15')
		expect(notes.length).toBeGreaterThan(0)
		const found = notes.find(n => n.content === 'Note for backup test')
		expect(found).toBeDefined()
	})
})
