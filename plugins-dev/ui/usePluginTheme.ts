import { ref, onMounted, onUnmounted } from 'vue'
import { useSdk } from './useSdk'

type Theme = 'light' | 'dark'

const currentTheme = ref<Theme>('light')
let observer: MutationObserver | null = null
let initialized = false

const getSdkTheme = (): Theme => {
	try {
		return useSdk().ui.getTheme() as Theme
	} catch {
		return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
	}
}

export const usePluginTheme = () => {
	const init = () => {
		if (initialized) return
		initialized = true

		const updateTheme = () => {
			currentTheme.value = getSdkTheme()
		}

		updateTheme()

		observer = new MutationObserver(updateTheme)
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
	}

	onMounted(init)

	onUnmounted(() => {
		if (observer) {
			observer.disconnect()
			observer = null
			initialized = false
		}
	})

	return {
		theme: currentTheme,
		isDark: () => currentTheme.value === 'dark',
	}
}
