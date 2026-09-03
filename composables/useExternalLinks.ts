// Ouvre les liens externes dans le navigateur par défaut en mode Tauri
// En mode web, laisse le comportement normal (target="_blank")

export const useExternalLinks = () => {
	const isTauri = ref(false)

	onMounted(() => {
		isTauri.value = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
	})

	const openExternal = async (url: string) => {
		if (isTauri.value) {
			const { open } = await import('@tauri-apps/plugin-shell')
			await open(url)
		} else {
			window.open(url, '_blank', 'noopener,noreferrer')
		}
	}

	// Intercepter tous les clics sur les liens externes
	const interceptLinks = (event: MouseEvent) => {
		if (!isTauri.value) return
		const target = event.target as HTMLElement
		const link = target.closest('a')
		if (!link) return
		const href = link.getAttribute('href')
		if (!href) return
		// Seulement les liens http/https externes
		if (!href.startsWith('http://') && !href.startsWith('https://')) return
		// Ignorer les liens vers l'app elle-même (127.0.0.1, localhost)
		if (href.includes('127.0.0.1') || href.includes('localhost')) return
		event.preventDefault()
		event.stopPropagation()
		event.stopImmediatePropagation()
		openExternal(href)
	}

	onMounted(() => {
		document.addEventListener('click', interceptLinks, true)
	})

	onUnmounted(() => {
		document.removeEventListener('click', interceptLinks, true)
	})

	return { openExternal, isTauri }
}
