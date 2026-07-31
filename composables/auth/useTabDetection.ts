/**
 * Détecte si plusieurs onglets de l'application sont ouverts
 * Utilise BroadcastChannel pour la communication entre onglets
 */
export const useTabDetection = () => {
    const isMultipleTabsOpen = ref(false)
    const tabId = ref<string>('')

    onMounted(() => {
        // Générer un ID unique pour cet onglet
        tabId.value = `tab_${Date.now()}_${Math.random()}`

        // Créer un canal de communication entre onglets
        const channel = new BroadcastChannel('app_tabs')

        // Écouter les messages des autres onglets
        channel.onmessage = (event) => {
            if (event.data.type === 'ping' && event.data.tabId !== tabId.value) {
                // Un autre onglet est actif
                isMultipleTabsOpen.value = true
                // Répondre pour signaler notre présence
                channel.postMessage({ type: 'pong', tabId: tabId.value })
            } else if (event.data.type === 'pong' && event.data.tabId !== tabId.value) {
                // Un autre onglet a répondu
                isMultipleTabsOpen.value = true
            }
        }

        // Envoyer un ping au démarrage
        channel.postMessage({ type: 'ping', tabId: tabId.value })

        // Nettoyer à la fermeture
        onUnmounted(() => {
            channel.close()
        })
    })

    return {
        isMultipleTabsOpen: readonly(isMultipleTabsOpen)
    }
}
