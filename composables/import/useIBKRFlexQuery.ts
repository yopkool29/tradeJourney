export const useIBKRFlexQuery = (
    tokenRef?: Ref<string> | ComputedRef<string>,
    queryIdRef?: Ref<string> | ComputedRef<string>
) => {
    const userStore = useUserStore()
    
    // Configuration IBKR : utiliser les refs passées en paramètre, sinon fallback sur les settings globaux
    const token = tokenRef ?? computed(() => userStore.user?.settings_object?.ibkrFlexQueryToken || '')
    const queryId = queryIdRef ?? computed(() => userStore.user?.settings_object?.ibkrFlexQueryId || '')

    const sendRequest = async (): Promise<string> => {
        if (!token.value || !queryId.value) {
            throw new Error('IBKR Flex Query token and query ID must be configured in settings')
        }

        try {
            const response = await $fetch('/api/ibkr-flex-query', {
                method: 'POST',
                body: {
                    action: 'sendRequest',
                    token: token.value,
                    queryId: queryId.value
                }
            })

            if (!response.success) {
                throw new Error('Failed to send Flex Query request')
            }

            return response.success && 'referenceCode' in response ? response.referenceCode : ''
        } catch (error) {
            console.error('Error sending Flex Query request:', error)
            throw error
        }
    }

    const getStatement = async (
        refCode: string,
        maxWaitTime: number = 60,
        checkInterval: number = 5
    ): Promise<string> => {
        let elapsedTime = 0

        // Attendre un peu avant la première vérification
        await new Promise(resolve => setTimeout(resolve, checkInterval * 1000))

        while (elapsedTime < maxWaitTime) {
            try {
                const response = await $fetch('/api/ibkr-flex-query', {
                    method: 'POST',
                    body: {
                        action: 'getStatement',
                        token: token.value,
                        queryId: queryId.value,
                        refCode: refCode
                    }
                })

                // Vérifier si les données sont prêtes
                if ('ready' in response && response.ready && response.data) {
                    // console.log('response.data', response.data)
                    return response.data
                }

                // Vérifier si le rapport est encore en cours de génération
                if ('generating' in response && response.generating) {
                    console.log(`Report still generating... (elapsed: ${elapsedTime}s)`)
                } else {
                    console.log(`Unexpected response state`)
                }

                // Attendre avant la prochaine vérification
                if (elapsedTime + checkInterval < maxWaitTime) {
                    await new Promise(resolve => setTimeout(resolve, checkInterval * 1000))
                }
                elapsedTime += checkInterval

            } catch (error) {
                console.error('Error getting statement:', error)
                throw error
            }
        }

        throw new Error(`Timeout after ${maxWaitTime}s - report may still be generating`)
    }

    const executeFlexQuery = async (): Promise<string> => {
        try {
            // Étape 1: Envoyer la requête
            console.log('Sending Flex Query request...')
            const refCode = await sendRequest()
            console.log(`Query submitted successfully. Reference: ${refCode}`)

            // Étape 2: Récupérer les résultats
            console.log('Waiting for report generation...')
            const csvData = await getStatement(refCode)
            console.log('Report ready!')

            return csvData
        } catch (error) {
            console.error('Error executing Flex Query:', error)
            throw error
        }
    }

    const isConfigured = computed(() => {
        return !!(token.value && queryId.value)
    })

    return {
        sendRequest,
        getStatement,
        executeFlexQuery,
        isConfigured,
    }
}
