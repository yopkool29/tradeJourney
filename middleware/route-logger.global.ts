export default defineNuxtRouteMiddleware((to, from) => {
    // Ne pas logger côté serveur pour éviter les logs inutiles
    if (import.meta.server) return

    // Vérifier si le logging des routes est activé
    const config = useRuntimeConfig()
    if (!config.public.enableRouteLogger) return

    const { log_info } = useLogView()
    
    // Construire le message de log
    const fromPath = from.path || 'initial'
    const toPath = to.path
    
    // Logger la navigation
    if (fromPath !== toPath) {
        const message = `Navigation: ${fromPath} → ${toPath}`
        log_info(message)
        
        // Logger les paramètres de query si présents
        if (Object.keys(to.query).length > 0) {
            log_info('Query params:', to.query)
        }
        
        // Logger les paramètres de route si présents
        if (Object.keys(to.params).length > 0) {
            log_info('Route params:', to.params)
        }
    }
})
