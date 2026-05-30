import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { CreateTradeType, TradeType } from '~/schema/trade'
import type { CreateAccountType, AccountType } from '~/schema/account'
import type { Database } from '~/composables/useDatabase'
import { InstrumentType } from '~/type'
import {
	checkServerRunning,
	loginTestUser,
	generateTestDbName,
	cleanupOldTestDatabases,
	deleteTestDatabase,
	updateSessionCookie,
	BASE_URL,
	TEST_USER_PASSWORD
} from './utils/test-helpers'

describe('Database Integration - Trade CRUD', () => {
    let testDbName: string
    let testDbId: number
    let testAccount: AccountType | null = null
    let createdTrade: TradeType | null = null

    beforeAll(async () => {
        // Check if server is running
        await checkServerRunning()

        // Login test user via API and capture session cookie
        const loginResult = await loginTestUser()

        // Initialize user store with logged in user
        const userStore = useUserStore()
        
        userStore.setUser(loginResult)

        // Cleanup: Delete any leftover test databases from previous runs
        await cleanupOldTestDatabases()
    })

    afterAll(async () => {
        // Guaranteed cleanup of test database even if tests fail
        await deleteTestDatabase(testDbId)
    })

    it('should create a test database', async () => {
        const { createDatabase } = useDatabase()

        testDbName = generateTestDbName()
        const result = await createDatabase(testDbName, `Test DB ${testDbName}`) as Database

        expect(result).toBeDefined()
        expect(result.name).toBe(testDbName)
        expect(result.id).toBeDefined()

        testDbId = result.id

        // Select database and capture the updated JWT cookie
        const selectResp = await $fetch.raw(`${BASE_URL}/api/database/select`, {
            method: 'POST',
            body: { databaseId: testDbId }
        })

        const newCookie = selectResp.headers.get('set-cookie')
        if (newCookie) {
            updateSessionCookie(newCookie.split(';')[0])
            console.log('Updated session cookie with database ID')
        }

        // Wait for schema initialization to complete (this can take 10-20 seconds)
        console.log('Waiting for database schema to be ready...')
        await new Promise(r => setTimeout(r, 15000))

        // Now fetch tags manually
        const { fetchGroups } = useTags()
        await fetchGroups()
    }, 30000)

    it('should create a test account', async () => {
        const { createAccount } = useAccount()

        const newAccount: CreateAccountType = {
            name: `test_account_${Date.now()}`,
            fullname: 'Test Account for Integration Tests',
            displayName: 'Test Account',
            aliases: ''
        }

        try {
            testAccount = await createAccount(newAccount)
            console.log('Account created:', testAccount.id)
        } catch (err: any) {
            console.error('Failed to create account:', err.message, err.data)
            throw err
        }

        expect(testAccount).toBeDefined()
        expect(testAccount.id).toBeDefined()
        expect(testAccount.name).toBe(newAccount.name)
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
            note: 'Test trade created by integration test',
            active: true,
            accountId: testAccount.id,
            screenshots: []
        }

        createdTrade = await createTrade(newTrade)

        expect(createdTrade).toBeDefined()
        expect(createdTrade.id).toBeDefined()
        expect(createdTrade.symbol).toBe('TEST_SYMBOL')
        expect(createdTrade.type).toBe('buy')
        expect(createdTrade.lot).toBe(1.0)
        expect(createdTrade.profit).toBe(100.0)
        expect(createdTrade.note).toBe('Test trade created by integration test')
    })

    it('should fetch the created trade', async () => {
        const { fetchTrade } = useTrades()

        if (!createdTrade) {
            throw new Error('No trade was created in previous test')
        }

        const fetchedTrade = await fetchTrade(createdTrade.id)

        expect(fetchedTrade).toBeDefined()
        expect(fetchedTrade?.id).toBe(createdTrade.id)
        expect(fetchedTrade?.symbol).toBe('TEST_SYMBOL')
        expect(fetchedTrade?.note).toBe('Test trade created by integration test')
    })

    it('should update the trade', async () => {
        const { updateTrade } = useTrades()

        if (!createdTrade) {
            throw new Error('No trade was created in previous test')
        }

        const updatedTrade = await updateTrade({
            id: createdTrade.id,
            note: 'Updated note from integration test',
            profit: 150.0,
            netProfit: 145.0
        })

        expect(updatedTrade).toBeDefined()
        expect(updatedTrade.id).toBe(createdTrade.id)
        expect(updatedTrade.note).toBe('Updated note from integration test')
        expect(updatedTrade.profit).toBe(150.0)
        expect(updatedTrade.netProfit).toBe(145.0)
    })

    it('should fetch trades list and find our trade', async () => {
        const { fetchTrades } = useTrades()

        const trades = await fetchTrades({ symbol: 'TEST_SYMBOL' }, 100)

        expect(Array.isArray(trades)).toBe(true)
        expect(trades.length).toBeGreaterThan(0)

        const foundTrade = trades.find(t => t.symbol === 'TEST_SYMBOL' && t.note === 'Updated note from integration test')
        expect(foundTrade).toBeDefined()
    })

    it('should delete the trade', async () => {
        const { deleteTrade } = useTrades()

        if (!createdTrade) {
            throw new Error('No trade was created in previous test')
        }

        // Delete the trade (soft-delete)
        await deleteTrade(createdTrade.id)

        // Verify the trade is deleted by checking it returns 404
        let tradeNotFound = false
        try {
            await $fetch(`${BASE_URL}/api/trades/${createdTrade.id}`)
        } catch (err: any) {
            if (err.response?.status === 404) {
                tradeNotFound = true
            }
        }
        expect(tradeNotFound).toBe(true)
    })

    it('should cleanup test database', async () => {
        const { deleteDatabase, currentDatabase } = useDatabase()

        if (!testDbId) {
            throw new Error('No test database was created')
        }

        // Clear current database selection first
        if (currentDatabase.value?.id === testDbId) {
            const { clearCurrentDatabase } = useDatabase()
            clearCurrentDatabase()
        }

        // Delete the test database
        await deleteDatabase(testDbId, TEST_USER_PASSWORD)

        // Verify database is removed by fetching list
        const { fetchDatabases, databases } = useDatabase()
        await fetchDatabases()

        const deletedDb = databases.value.find(db => db.id === testDbId)
        expect(deletedDb).toBeUndefined()
    })
})
