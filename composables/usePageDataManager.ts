import type { Ref } from 'vue'
import type { AccountType } from '~/schema/account'

type PageDataManagerOptions = {
	fetchFn: () => Promise<unknown>
	onBeforeFetch?: () => void | Promise<void>
	onAfterFetch?: () => void | Promise<void>
	accounts?: Ref<AccountType[]>
	getAccountIds?: () => number[]
	setAccountIds?: (ids: number[]) => void
	debounceMs?: number
}

export const usePageDataManager = (options: PageDataManagerOptions) => {
	const {
		fetchFn,
		onBeforeFetch,
		onAfterFetch,
		accounts,
		getAccountIds,
		setAccountIds,
		debounceMs = 200,
	} = options

	const filterLoading = ref(false)
	let runId = 0

	const load = async () => {
		const currentRun = ++runId
		filterLoading.value = true
		try {
			await onBeforeFetch?.()
			await fetchFn()
			if (currentRun !== runId) return
			await onAfterFetch?.()
		} finally {
			if (currentRun === runId) filterLoading.value = false
		}
	}

	const loadDebounced = useDebounce(load, debounceMs, { leading: true })

	if (accounts && getAccountIds && setAccountIds) {
		watch([accounts], ([accountsList]) => {
			const currentIds = getAccountIds()
			if (!currentIds?.length) return

			const validIds = currentIds.filter((id) => accountsList.some((account) => account.id === id))
			if (validIds.length !== currentIds.length) {
				setAccountIds(validIds.length ? validIds : [])
			}
		})
	}

	return {
		filterLoading,
		load,
		loadDebounced,
	}
}
