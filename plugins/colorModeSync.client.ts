export default defineNuxtPlugin(() => {
	const colorMode = useColorMode()

	// Sync .dark class for dark-based themes
	watch(
		() => colorMode.value,
		(theme) => {
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
