export default defineNuxtPlugin(() => {
    // Vérifier si le logging des API est activé
    const config = useRuntimeConfig()
    if (!config.public.enableApiLogger) return

    // Intercepter toutes les requêtes $fetch
    const originalFetch = globalThis.$fetch

    globalThis.$fetch = new Proxy(originalFetch, {
        apply(target, thisArg, argumentsList) {
            const [_url, options] = argumentsList
            const _method = options?.method || 'GET'
            const startTime = Date.now()

            // Exécuter la requête originale
            return Reflect.apply(target, thisArg, argumentsList)
                .then((response: unknown) => {
                    const _duration = Date.now() - startTime
                    // log_info(`✅ API ${method} ${url} - ${duration}ms`)
                    return response
                })
                .catch((error: unknown) => {
                    const _duration = Date.now() - startTime
                    // log_error(`❌ API ${method} ${url} - ${duration}ms - ${error.message || error}`)
                    throw error
                })
        }
    })
})
