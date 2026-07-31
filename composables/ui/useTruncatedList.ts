interface TruncatedListOptions<T> {
	getItems: () => T[]
	getLabel: (item: T) => string
	maxChars: number
}

// Composable générique pour tronquer une liste d'éléments affichables en fonction d'un budget de caractères.
// Affiche autant d'éléments que possible sans dépasser maxChars, puis un badge "+N" pour le reste.
export const useTruncatedList = <T,>(options: TruncatedListOptions<T>) => {
	// Liste des éléments effectivement rendus (tronquée si nécessaire)
	const displayedItems = computed(() => {
		const items = options.getItems()
		if (items.length === 0) return []
		let charCount = 0
		const result: T[] = []
		for (const item of items) {
			const label = options.getLabel(item)
			const tagLen = label.length
			// Le premier élément est toujours affiché, même s'il dépasse seul le budget
			if (result.length === 0) {
				result.push(item)
				charCount += tagLen
				// Les suivants s'ajoutent tant que la somme reste dans le budget
			} else if (charCount + tagLen <= options.maxChars) {
				result.push(item)
				charCount += tagLen
			} else {
				break
			}
		}
		return result
	})

	const hiddenCount = computed(() => {
		const items = options.getItems()
		return items.length - displayedItems.value.length
	})
	const hiddenLabels = computed(() => {
		const items = options.getItems()
		return items.slice(displayedItems.value.length).map(options.getLabel).join(', ')
	})
	const hasHidden = computed(() => hiddenCount.value > 0)

	return {
		displayedItems,
		hiddenCount,
		hiddenLabels,
		hasHidden,
	}
}
