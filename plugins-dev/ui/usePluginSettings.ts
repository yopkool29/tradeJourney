import { ref, watch } from 'vue'

// Cache in-memory des settings par pluginId pour éviter de parser JSON à chaque accès
const cache = new Map<string, ReturnType<typeof ref<Record<string, unknown>>>>

/**
 * Persiste des settings dans le localStorage, scoped par pluginId.
 * Les settings sont sauvegardés automatiquement (watch) à chaque modification.
 *
 * Usage :
 *   const settings = usePluginSettings('tradingview-converter', { symbol: 'MYM' })
 *   settings.value.symbol = 'YM'  // sauvegardé automatiquement
 */
export const usePluginSettings = <T extends Record<string, unknown>>(
	pluginId: string,
	defaults: T,
): ReturnType<typeof ref<T>> => {
	const storageKey = `tj-plugin-settings:${pluginId}`

	// Retourner le ref caché si déjà chargé (même composant monté plusieurs fois)
	if (cache.has(storageKey)) {
		return cache.get(storageKey) as ReturnType<typeof ref<T>>
	}

	// Charger depuis localStorage
	let loaded: Partial<T> = {}
	try {
		const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
		if (raw) {
			loaded = JSON.parse(raw) as Partial<T>
		}
	} catch (e) {
		console.warn(`[plugin:${pluginId}] Failed to load settings from localStorage:`, e)
	}

	// Merge defaults + loaded
	const settings = ref({ ...defaults, ...loaded }) as ReturnType<typeof ref<T>>

	// Persister automatiquement à chaque changement
	if (typeof window !== 'undefined') {
		watch(settings, (val) => {
			try {
				window.localStorage.setItem(storageKey, JSON.stringify(val))
			} catch (e) {
				console.warn(`[plugin:${pluginId}] Failed to save settings to localStorage:`, e)
			}
		}, { deep: true })
	}

	cache.set(storageKey, settings as ReturnType<typeof ref<Record<string, unknown>>>)
	return settings
}
