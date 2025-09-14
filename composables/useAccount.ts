import { z } from 'zod'
import type { AccountType, CreateAccountType, UpdateAccountType } from '~/schema/account'
import { AccountSchema } from '~/schema/account'

export const useAccount = () => {
    const accounts = ref<AccountType[]>([])

    const fetchAccounts = async (): Promise<AccountType[]> => {
        const result = await $fetch<AccountType[]>('/api/account')
        accounts.value = z.array(AccountSchema).parse(result)
        return accounts.value
    }

    const createAccount = async (account: CreateAccountType) => {
        const result = await $fetch<AccountType>('/api/account', { method: 'POST', body: account })
        return AccountSchema.parse(result)
    }

    const updateAccount = async (account: UpdateAccountType) => {
        const result = await $fetch<AccountType>(`/api/account`, { method: 'PATCH', body: account })
        return AccountSchema.parse(result)
    }

    const deleteAccount = async (id: number) => {
        return await $fetch(`/api/account/${id}`, { method: 'DELETE' })
    }

    return {
        accounts,
        fetchAccounts,
        createAccount,
        updateAccount,
        deleteAccount
    }
}
