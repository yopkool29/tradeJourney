interface UseLazyRenderOptions {
	// Delai minimum avant rendu (ms)
	minDelay?: number
	// Delai maximum avant rendu (ms)
	maxDelay?: number
	// Identifiant unique pour generer un delai consistant
	id?: string
	// Condition initiale pour forcer le rendu immediat
	immediate?: boolean
}

/**
 * Composable pour un rendu progressif/graduel des composants
 * Utile pour etaler le chargement de nombreux composants lourds
 */
export const useLazyRender = (options: UseLazyRenderOptions = {}) => {
	const {
		minDelay = 0,
		maxDelay = 300,
		id = '',
		immediate = false,
	} = options

	const isVisible = ref(immediate)
	let renderTimeout: ReturnType<typeof setTimeout> | null = null

	// Generer un delai pseudo-aleatoire base sur l'ID
	const getStaggeredDelay = (): number => {
		if (!id) return Math.random() * (maxDelay - minDelay) + minDelay

		// Hash simple de l'ID pour avoir un delai consistant
		let hash = 0
		for (let i = 0; i < id.length; i++) {
			hash = ((hash << 5) - hash) + id.charCodeAt(i)
			hash = hash & hash
		}
		const range = maxDelay - minDelay
		return minDelay + (Math.abs(hash) % range)
	}

	// Lancer le rendu avec delai
	const triggerRender = (): void => {
		if (isVisible.value) return

		if (renderTimeout) clearTimeout(renderTimeout)
		renderTimeout = setTimeout(() => {
			isVisible.value = true
		}, getStaggeredDelay())
	}

	// Forcer le rendu immediat
	const forceRender = (): void => {
		if (renderTimeout) clearTimeout(renderTimeout)
		isVisible.value = true
	}

	// Reinitialiser (pour reutilisation)
	const reset = (): void => {
		if (renderTimeout) clearTimeout(renderTimeout)
		isVisible.value = false
	}

	// Nettoyage
	const cleanup = (): void => {
		if (renderTimeout) clearTimeout(renderTimeout)
	}

	onUnmounted(cleanup)

	return {
		isVisible: readonly(isVisible),
		triggerRender,
		forceRender,
		reset,
	}
}

/**
 * Variante avec declencheur reactif
 * Le rendu se lance quand la condition passe a true
 */
export const useConditionalLazyRender = (
	condition: Ref<boolean>,
	options: UseLazyRenderOptions = {}
) => {
	const lazyRender = useLazyRender(options)

	watch(condition, (isActive) => {
		if (isActive && !lazyRender.isVisible.value) {
			lazyRender.triggerRender()
		}
	})

	onMounted(() => {
		if (condition.value) {
			lazyRender.triggerRender()
		}
	})

	return lazyRender
}
