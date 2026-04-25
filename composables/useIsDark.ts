export const useIsDark = () => {
	const colorMode = useColorMode()
	return computed(() => ['dark', 'dark-gold'].includes(colorMode.value))
}
