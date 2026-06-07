import type { TradeFilter } from '~/type'

export type FilterPageType = 'dashboard' | 'daily' | 'calendar'

interface UseFilteredPageOptions {
	pageType: FilterPageType
	threshold?: number
	debounceMs?: number
	onFetch: () => Promise<void>
	buildFiltersFn: () => TradeFilter[]
}

export const useFilteredPage = (options: UseFilteredPageOptions) => {
	const { pageType, threshold: customThreshold, debounceMs = 300, onFetch, buildFiltersFn } = options

	const config = useRuntimeConfig()
	const threshold = customThreshold ?? config.public.tradeCountThreshold ?? 1000

	// État local par page via useState
	const filterDirty = useState<boolean>(`${pageType}-filter-dirty`, () => false)
	const tradeCount = useState<number>(`${pageType}-trade-count`, () => 0)

	const { fetchFilteredTradeCount } = useTrades()

	const isAutoApplyMode = computed(() => tradeCount.value < threshold)

	const updateTradeCount = async (): Promise<number> => {
		const filterParams = buildFiltersFn()
		const count = await fetchFilteredTradeCount(filterParams)
		tradeCount.value = count
		return count
	}

	// Centralisé : gérer tout changement de filtre (count + auto/manuel)
	const handleFilterChange = async (shouldFetch = true): Promise<void> => {
		await updateTradeCount()
		if (isAutoApplyMode.value) {
			// Mode auto : jamais de dirty, fetch seulement si demandé
			filterDirty.value = false
			if (shouldFetch) {
				await onFetch()
			}
		} else {
			// Mode manuel : dirty = true, fetch au clic "Appliquer"
			filterDirty.value = true
		}
	}

	// Debounced version pour éviter le spam API
	const debouncedHandleFilterChange = useDebounce(handleFilterChange, debounceMs, { leading: true })

	// Clic sur "Appliquer" (mode manuel)
	const onExplicitApply = async (): Promise<void> => {
		filterDirty.value = false
		await onFetch()
	}

	// Suppression d'un filtre (immediate apply comme "Effacer")
	const onRemoveFilter = async (): Promise<void> => {
		// En mode auto : fetch immédiat
		// En mode manuel : dirty reste true jusqu'au clic "Appliquer"
		if (isAutoApplyMode.value) {
			await handleFilterChange(true)
		} else {
			// Juste recalculer le count et mettre dirty
			await updateTradeCount()
			filterDirty.value = true
		}
	}

	// Reset des filtres
	const onResetFilters = async (): Promise<void> => {
		filterDirty.value = false
		await handleFilterChange(true)
	}

	return {
		// State
		filterDirty,
		tradeCount,
		isAutoApplyMode,

		// Actions
		updateTradeCount,
		handleFilterChange,
		debouncedHandleFilterChange,
		onExplicitApply,
		onRemoveFilter,
		onResetFilters,
	}
}
