export default defineNuxtPlugin(() => {
    // Vérifier si le logging des API est activé
    const config = useRuntimeConfig()
    if (!config.public.enableApiLogger) return

    const { log_info, log_error } = useLogView()

    // Intercepter toutes les requêtes $fetch
    const originalFetch = globalThis.$fetch

    globalThis.$fetch = new Proxy(originalFetch, {
        apply(target, thisArg, argumentsList) {
            const [url, options] = argumentsList
            const method = options?.method || 'GET'
            const startTime = Date.now()

            // Exécuter la requête originale
            return Reflect.apply(target, thisArg, argumentsList)
                .then((response: any) => {
                    const duration = Date.now() - startTime
                    log_info(`✅ API ${method} ${url} - ${duration}ms`)
                    return response
                })
                .catch((error: any) => {
                    const duration = Date.now() - startTime
                    log_error(`❌ API ${method} ${url} - ${duration}ms - ${error.message || error}`)
                    throw error
                })
        }
    })
})
