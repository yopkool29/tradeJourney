// plugins/pinia-persistedstate.client.ts
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineNuxtPlugin((nuxtApp) => {
  const pinia = usePinia()
  pinia.use(piniaPluginPersistedstate)
})