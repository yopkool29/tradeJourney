export default defineNuxtPlugin(() => {
	const colorMode = useColorMode()

	// Ne pas synchroniser tant que le thème réel n'est pas connu
	// (l'hydratation SSR arrive avec value='light' et unknown=true,
	// ce qui retirerait .dark prématurément et causerait un flash)
	watch(
		() => colorMode.value,
		(theme) => {
			if (colorMode.unknown) return
			const html = document.documentElement
			const isDarkTheme = ['dark', 'dark-gold'].includes(theme)

			if (isDarkTheme && !html.classList.contains('dark')) {
				html.classList.add('dark')
			} else if (!isDarkTheme && html.classList.contains('dark')) {
				html.classList.remove('dark')
			}
		},
		{ immediate: true }
	)
})
