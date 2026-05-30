import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { CreateAccountType, AccountType, UpdateAccountType } from '~/schema/account'
import { acquireTestDatabase, releaseTestDatabase } from './utils/test-database'

describe('Database Integration - Account CRUD', () => {
	let testDbId: number
	let createdAccount: AccountType | null = null

	beforeAll(async () => {
		const db = await acquireTestDatabase()
		testDbId = db.id
	}, 30000)

	afterAll(async () => {
		await releaseTestDatabase(testDbId)
	})

	it('should fetch empty accounts list', async () => {
		const { fetchAccounts, accounts } = useAccount()
		const result = await fetchAccounts()
		expect(Array.isArray(result)).toBe(true)
		expect(accounts.value.length).toBe(0)
	})

	it('should create an account', async () => {
		const { createAccount } = useAccount()
		const newAccount: CreateAccountType = {
			name: `test_account_${Date.now()}`,
			fullname: 'Test Account Full Name',
			displayName: 'Test Account',
			aliases: 'alias1, alias2'
		}
		createdAccount = await createAccount(newAccount)
		expect(createdAccount).toBeDefined()
		expect(createdAccount.id).toBeDefined()
		expect(createdAccount.name).toBe(newAccount.name)
		expect(createdAccount.fullname).toBe(newAccount.fullname)
		expect(createdAccount.displayName).toBe(newAccount.displayName)
		expect(createdAccount.aliases).toBe('alias1, alias2')
	})

	it('should fetch accounts and find the created one', async () => {
		const { fetchAccounts, accounts } = useAccount()
		const result = await fetchAccounts()
		expect(result.length).toBeGreaterThan(0)
		expect(accounts.value.length).toBeGreaterThan(0)
		const found = accounts.value.find(a => a.id === createdAccount?.id)
		expect(found).toBeDefined()
		expect(found?.name).toBe(createdAccount?.name)
	})

	it('should update an account', async () => {
		const { updateAccount } = useAccount()
		if (!createdAccount) {
			throw new Error('No account was created')
		}
		const updateData: UpdateAccountType = {
			id: createdAccount.id,
			displayName: 'Updated Test Account',
			aliases: 'updated_alias'
		}
		const updated = await updateAccount(updateData)
		expect(updated).toBeDefined()
		expect(updated.id).toBe(createdAccount.id)
		expect(updated.displayName).toBe('Updated Test Account')
		expect(updated.aliases).toBe('updated_alias')
		createdAccount = updated
	})

	it('should delete the account', async () => {
		const { deleteAccount, fetchAccounts } = useAccount()
		if (!createdAccount) {
			throw new Error('No account was created')
		}
		await deleteAccount(createdAccount.id)
		const accounts = await fetchAccounts()
		const found = accounts.find(a => a.id === createdAccount?.id)
		expect(found).toBeUndefined()
	})
})
