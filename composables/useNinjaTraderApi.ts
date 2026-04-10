export const useNinjaTraderApi = () => {
    const config = useRuntimeConfig()
    const userStore = useUserStore()
    const { log_debug } = useLogView()
    
    // Récupérer le port depuis les settings utilisateur (défaut: 8080)
    const port = computed(() => userStore.user?.settings_object?.ninjaTraderApiPort || 8080)
    const ninjaTraderApiUrl = computed(() => `http://localhost:${port.value}`)

    const checkApiHealth = async (): Promise<boolean> => {
        try {
            const response = await fetch(`${ninjaTraderApiUrl.value}/api/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            
            if (!response.ok) {
                return false
            }
            
            const data = await response.json()
            return data.status === 'ok'
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'API NinjaTrader:', error)
            return false
        }
    }

    const fetchTrades = async (options?: {
        account?: string
        startDate?: string
        endDate?: string
    }): Promise<string> => {
        try {
            const params = new URLSearchParams()
            params.append('format', 'csv')
            
            if (options?.account) {
                params.append('account', options.account)
            }
            if (options?.startDate) {
                params.append('startDate', options.startDate)
            }
            if (options?.endDate) {
                params.append('endDate', options.endDate)
            }
            
            const response = await fetch(`${ninjaTraderApiUrl.value}/api/trades?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv',
                },
            })
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`)
            }
            
            const csvData = await response.text()

            // log_debug('NinjaTrader API - CSV Data:', csvData)

            return csvData
        } catch (error) {
            console.error('Erreur lors de la récupération des trades:', error)
            throw error
        }
    }

    const fetchTradesJson = async (options?: {
        account?: string
        startDate?: string
        endDate?: string
    }) => {
        try {
            const params = new URLSearchParams()
            params.append('format', 'json')
            
            if (options) {
                if (options.account) {
                    params.append('account', options.account)
                }
                if (options.startDate) {
                    params.append('startDate', options.startDate)
                }
                if (options.endDate) {
                    params.append('endDate', options.endDate)
                }
            }
            
            const response = await fetch(`${ninjaTraderApiUrl.value}/api/trades?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            })
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`)
            }
            
            const jsonData = await response.json()
            return jsonData
        } catch (error) {
            console.error('Erreur lors de la récupération des trades JSON:', error)
            throw error
        }
    }

    return {
        checkApiHealth,
        fetchTrades,
        fetchTradesJson,
        ninjaTraderApiUrl,
    }
}
