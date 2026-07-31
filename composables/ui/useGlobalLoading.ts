export const useGlobalLoading = () => {
    const isLoading = useState<boolean>('globalLoading', () => false)
    
    let loadingTimeout: ReturnType<typeof setTimeout> | null = null
    
    // Watch pour couper le loading automatiquement après 10 secondes
    watch(isLoading, (loading) => {
        if (loadingTimeout) {
            clearTimeout(loadingTimeout)
            loadingTimeout = null
        }
        
        if (loading) {
            loadingTimeout = setTimeout(() => {
                isLoading.value = false
                loadingTimeout = null
            }, 8000)
        }
    })
    
    return {
        isLoading,
        startLoading: () => { isLoading.value = true },
        stopLoading: () => { isLoading.value = false }
    }
}
