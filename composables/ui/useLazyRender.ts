import { ref, watch, onMounted, onUnmounted, readonly, type Ref } from 'vue'

interface UseLazyRenderOptions {
	// Delai minimum avant rendu (ms)
	minDelay?: number
	// Delai maximum avant rendu (ms)
	maxDelay?: number
	// Identifiant unique pour generer un delai consistant
	id?: string
	// Index pour delai progressif (0-based)
	index?: number
	// Delai de base pour le delai progressif (ms)
	baseDelay?: number
	// Increment par index pour le delai progressif (ms)
	delayIncrement?: number
	// Delai maximum pour le delai progressif (ms)
	maxIndexedDelay?: number
	// Delai fixe pour remplacer le delai indexe (pour clics manuels)
	overrideDelay?: number
	// Condition initiale pour forcer le rendu immediat
	immediate?: boolean
	// Sauter le delai lors du declenchement manuel
	skipDelayOnTrigger?: boolean
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
		index,
		baseDelay = 300,
		delayIncrement = 50,
		maxIndexedDelay,
		overrideDelay,
		immediate = false,
		skipDelayOnTrigger = false,
	} = options

	const isVisible = ref(immediate)
	let renderTimeout: ReturnType<typeof setTimeout> | null = null
	const overrideDelayRef = ref(overrideDelay)

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

	// Generer un delai progressif base sur l'index (non aleatoire)
	const getIndexedDelay = (): number => {
		if (overrideDelayRef.value !== undefined) {
			// console.log(`[useLazyRender] Override delay: ${overrideDelayRef.value}ms`)
			return overrideDelayRef.value
		}
		if (index === undefined) {
			const delay = getStaggeredDelay()
			// console.log(`[useLazyRender] Staggered delay (no index): ${delay}ms`)
			return delay
		}
		const delay = baseDelay + (index * delayIncrement)
		const finalDelay = maxIndexedDelay !== undefined ? Math.min(delay, maxIndexedDelay) : delay
		// console.log(`[useLazyRender] Indexed delay: index=${index}, delay=${finalDelay}ms`)
		return finalDelay
	}

	// Lancer le rendu avec delai
	const triggerRender = (): void => {
		if (isVisible.value) return

		if (renderTimeout) clearTimeout(renderTimeout)

		if (skipDelayOnTrigger) {
			isVisible.value = true
		} else {
			renderTimeout = setTimeout(() => {
				isVisible.value = true
			}, getIndexedDelay())
		}
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

	// Definir un delai de remplacement (pour clics manuels)
	const setOverrideDelay = (delay: number | undefined): void => {
		overrideDelayRef.value = delay
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
		setOverrideDelay,
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
