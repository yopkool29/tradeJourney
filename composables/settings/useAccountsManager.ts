import { CreateAccountSchema, type AccountType, type CreateAccountType, type UpdateAccountType } from '~/schema/account'
import type { CustomField } from '~/schema/symbol'
import type { FormSubmitEvent, FormErrorEvent } from '@nuxt/ui'
import type { TradeFilter, FilterColumn } from '~/type'
import { metadataHelpers } from '~/utils'
import { getAliasDisplay } from '~/utils/aliasResolver'

type AccountMetadata = { customFields?: { key: string; value?: string }[] }

export const useAccountsManager = () => {
	const { t } = useI18n()
	const userStore = useUserStore()
	const { log_error } = useLogView()
	const { errorStr, successStr, displayMessage } = useAlert()
	const { accounts, fetchAccounts: fetchAccountsBase, createAccount, updateAccount, deleteAccount } = useAccount()
	const { deleteAccountTrades } = useTrades()

	const isLoading = ref(false)

	const fetchAccounts = async () => {
		isLoading.value = true
		try {
			return await fetchAccountsBase()
		} finally {
			isLoading.value = false
		}
	}

	// Filtres avancés
	const filters = ref<TradeFilter[]>([{ column: 'displayName', operator: '=', value: '' }])
	const filterLoading = ref(false)

	const filterableColumnsConfig = computed<FilterColumn[]>(() => [
		{ label: t('components.settings.accounts.column_display_name'), value: 'displayName', dataType: 'text', operators: ['=', '!='], defaultOperator: '=' },
		{ label: t('components.settings.accounts.column_fullname'), value: 'fullname', dataType: 'text', operators: ['=', '!='], defaultOperator: '=' },
	])

	const addFilter = () => {
		if (filters.value.length < 2) {
			filters.value.push({ column: 'displayName', operator: '=', value: '' })
		}
	}

	const removeFilter = (index: number) => {
		filters.value.splice(index, 1)
	}

	const resetFilters = () => {
		filters.value = [{ column: 'displayName', operator: '=', value: '' }]
		applyFilters()
	}

	const applyFilters = () => {
		// Les filtres sont appliqués via computed filteredAccounts
	}

	const onApplyFilters = () => {
		filterLoading.value = true
		setTimeout(() => {
			applyFilters()
			filterLoading.value = false
		}, 100)
	}

	const filteredAccounts = computed(() => {
		return accounts.value.filter((account) => {
			return filters.value.every((filter) => {
				if (!filter.value && filter.value !== false) return true
				const accountValue = account[filter.column as keyof typeof account]
				const filterValue = filter.value
				switch (filter.operator) {
					case '=':
						return String(accountValue || '').toLowerCase().includes(String(filterValue).toLowerCase())
					case '!=':
						return !String(accountValue || '').toLowerCase().includes(String(filterValue).toLowerCase())
					default:
						return true
				}
			})
		})
	})

	const getDefaultCreateAccount = () => ({
		name: '', fullname: '', displayName: '', aliases: '',
	})

	const showAddAccount = ref(false)
	const newAccountState = ref<CreateAccountType>(getDefaultCreateAccount())
	const editingAccountId = ref<number | null>(null)
	const startingCapital = ref<number | null>(null)
	const customFields = ref<CustomField[]>([{ key: 'aliases', value: '' }])

	const customFieldsHasErrors = computed(() => {
		const allKeys = customFields.value.map(f => f.key.trim().toLowerCase()).filter(k => k)
		const hasDuplicates = allKeys.length !== new Set(allKeys).size
		const freeFields = customFields.value.slice(1)
		const hasEmptyKeys = freeFields.some(f => !f.key.trim())
		return hasDuplicates || hasEmptyKeys
	})

	watch(showAddAccount, (newValue) => {
		if (!newValue) {
			customFields.value = [{ key: 'aliases', value: '' }]
		}
	})

	watch(
		() => newAccountState.value.displayName,
		(newVal) => {
			if (!editingAccountId.value && newVal) {
				newAccountState.value.name = newVal
			}
		}
	)

	const columns = computed(() => [
		{ id: 'actions', accessorKey: 'actions', header: t('components.settings.accounts.column_actions') },
		{ id: 'id', accessorKey: 'id', header: t('components.settings.accounts.column_id') },
		{ id: 'displayName', accessorKey: 'displayName', header: t('components.settings.accounts.column_display_name') },
		{ id: 'fullname', accessorKey: 'fullname', header: t('components.settings.accounts.column_fullname') },
		{ id: 'startingCapital', accessorKey: 'startingCapital', header: t('components.settings.accounts.column_starting_capital') },
		{ id: 'aliases', accessorKey: 'aliases', header: t('components.settings.accounts.column_aliases') },
	])

	const onError = (_event: FormErrorEvent) => {
		const errorMessages = Object.values(_event.errors).flat()
		const errorMessage = errorMessages.length > 0 ? errorMessages[0] : t('components.settings.accounts.error_occurred')
		log_error(errorMessage)
		errorStr.value = errorMessage as string
		successStr.value = null
		setTimeout(() => {
			errorStr.value = null
			successStr.value = null
		}, 5000)
	}

	const copyAccountName = () => {
		if (newAccountState.value.name) {
			navigator.clipboard.writeText(newAccountState.value.name)
		}
	}

	const getStartingCapital = (account: AccountType): number | null => {
		return metadataHelpers.get<number>(account.metadata, 'startingCapital') ?? null
	}

	const getAccountAliasDisplay = (account: AccountType) => getAliasDisplay(account)

	const newAccount = () => {
		displayMessage(null, null)
		editingAccountId.value = null
		newAccountState.value = getDefaultCreateAccount()
		startingCapital.value = null
		customFields.value = [{ key: 'aliases', value: '' }]
		showAddAccount.value = true
	}

	const initCustomFieldsFromAccount = (account: AccountType) => {
		const existing = (account.metadata as AccountMetadata | null)?.customFields
		if (existing && existing.length > 0) {
			customFields.value = existing
		} else {
			customFields.value = [{ key: 'aliases', value: account.aliases ?? '' }]
		}
	}

	const editAccount = (account: AccountType) => {
		displayMessage(null, null)
		editingAccountId.value = account.id
		newAccountState.value = { ...account }
		startingCapital.value = metadataHelpers.get(account.metadata, 'startingCapital') ?? null
		initCustomFieldsFromAccount(account)
		showAddAccount.value = true
	}

	const onSubmitAccount = async (event: FormSubmitEvent<CreateAccountType | UpdateAccountType>) => {
		if (customFieldsHasErrors.value) return
		try {
			const dataToSend = {
				...event.data,
				startingCapital: startingCapital.value ?? null,
				customFields: customFields.value,
			}
			if (editingAccountId.value) {
				await updateAccount(dataToSend as UpdateAccountType)
				displayMessage(t('components.settings.accounts.account_updated'), null)
			} else {
				await createAccount(dataToSend as CreateAccountType)
				displayMessage(t('components.settings.accounts.account_created'), null)
			}
			await fetchAccounts()
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			displayMessage(null, message)
			log_error(message)
		} finally {
			showAddAccount.value = false
			customFields.value = [{ key: 'aliases', value: '' }]
		}
	}

	const onDeleteAccount = async (id: number) => {
		try {
			await deleteAccount(id)
			await fetchAccounts()
			displayMessage(t('components.settings.accounts.account_deleted'), null)
			userStore.triggerDataRefresh()
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			displayMessage(null, message)
			log_error(message)
		}
	}

	const onDeleteAccountTrades = async (id: number) => {
		try {
			const result = await deleteAccountTrades(id)
			await fetchAccounts()
			displayMessage(t('components.settings.accounts.delete_trades_success', { count: result.count }), null)
			userStore.triggerDataRefresh()
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			displayMessage(null, message)
			log_error(message)
		}
	}

	const onDeleteAccountDesactivatedTrades = async (id: number) => {
		try {
			const result = await deleteAccountTrades(id, true)
			await fetchAccounts()
			displayMessage(t('components.settings.accounts.delete_trades_success', { count: result.count }), null)
			userStore.triggerDataRefresh()
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			displayMessage(null, message)
			log_error(message)
		}
	}

	return {
		CreateAccountSchema,
		accounts, isLoading, fetchAccounts,
		filters, filterLoading, filterableColumnsConfig,
		addFilter, removeFilter, resetFilters, onApplyFilters,
		filteredAccounts,
		showAddAccount, newAccountState, editingAccountId, startingCapital, customFields,
		customFieldsHasErrors, columns,
		errorStr, successStr,
		onError, copyAccountName, getStartingCapital, getAccountAliasDisplay,
		newAccount, editAccount, onSubmitAccount,
		onDeleteAccount, onDeleteAccountTrades, onDeleteAccountDesactivatedTrades,
	}
}
