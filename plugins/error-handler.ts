export default defineNuxtPlugin((nuxtApp) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
        // Log l'erreur avec plus de détails
        console.error(error)
    }
})
