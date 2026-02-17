/**
 * API endpoint pour proxy les requêtes IBKR Flex Query
 * Contourne les problèmes CORS en passant par le serveur
 * 
 * IMPORTANT: IBKR Flex Web Service API limitation with date periods:
 * 
 * ✗ "Last N Days" (custom N): Does NOT work correctly with API
 *   - Returns inconsistent results (sometimes 1 day, sometimes partial data)
 *   - Manual download works, but API ignores the configuration
 * 
 * ✓ "Last 30 Calendar Days" (predefined): Works perfectly with API
 *   - Returns all trades for the last 30 days as expected
 *   - Recommended for API usage
 * 
 * Other working options: "Last Month", "Last Quarter", "Year To Date"
 * 
 * SOLUTION: In IBKR Client Portal, configure Flex Query with predefined periods
 * like "Last 30 Calendar Days" instead of "Last N Days" for API compatibility.
 */

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { action, token, queryId, refCode } = body

    if (!token || !queryId) {
        throw createError({
            statusCode: 400,
            message: 'Token and queryId are required'
        })
    }

    const baseUrl = 'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService'
    const flexVersion = 3

    try {
        if (action === 'sendRequest') {
            // Étape 1: Envoyer la requête Flex Query
            const params = new URLSearchParams({
                t: token,
                q: queryId,
                v: flexVersion.toString()
            })

            const response = await fetch(`${baseUrl}/SendRequest?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'User-Agent': 'TradeJourney-FlexQuery/1.0',
                }
            })

            if (!response.ok) {
                throw createError({
                    statusCode: response.status,
                    message: `IBKR API error: ${response.status}`
                })
            }

            const xmlText = await response.text()

            // Parser le XML pour extraire le statut et le code de référence
            const statusMatch = xmlText.match(/<Status>(.*?)<\/Status>/)
            const refCodeMatch = xmlText.match(/<ReferenceCode>(.*?)<\/ReferenceCode>/)
            const errorCodeMatch = xmlText.match(/<ErrorCode>(.*?)<\/ErrorCode>/)
            const errorMessageMatch = xmlText.match(/<ErrorMessage>(.*?)<\/ErrorMessage>/)

            const status = statusMatch ? statusMatch[1] : null
            const referenceCode = refCodeMatch ? refCodeMatch[1] : null
            const errorCode = errorCodeMatch ? errorCodeMatch[1] : null
            const errorMessage = errorMessageMatch ? errorMessageMatch[1] : null

            if (status !== 'Success') {
                throw createError({
                    statusCode: 400,
                    message: `Flex Query failed: ${errorCode} - ${errorMessage}`
                })
            }

            if (!referenceCode) {
                throw createError({
                    statusCode: 400,
                    message: 'No reference code in response'
                })
            }

            return {
                success: true,
                referenceCode
            }

        } else if (action === 'getStatement') {
            // Étape 2: Récupérer les résultats
            if (!refCode) {
                throw createError({
                    statusCode: 400,
                    message: 'Reference code is required for getStatement'
                })
            }

            const params = new URLSearchParams({
                t: token,
                q: refCode,
                v: flexVersion.toString()
            })

            const response = await fetch(`${baseUrl}/GetStatement?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'User-Agent': 'TradeJourney-FlexQuery/1.0',
                },
                redirect: 'follow'
            })

            if (!response.ok) {
                throw createError({
                    statusCode: response.status,
                    message: `IBKR API error: ${response.status}`
                })
            }

            const content = await response.text()

            // Debug: Sauvegarder le contenu dans /temp
            // try {
            //     const fs = await import('fs/promises')
            //     const path = await import('path')
            //     const tempDir = path.join(process.cwd(), 'temp')
            //     await fs.mkdir(tempDir, { recursive: true })
            //     const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            //     const filename = `ibkr-response-${timestamp}.txt`
            //     await fs.writeFile(path.join(tempDir, filename), content, 'utf-8')
            //     console.log(`[DEBUG] IBKR response saved to /temp/${filename}`)
            // } catch (err) {
            //     console.error('[DEBUG] Failed to save IBKR response:', err)
            // }

            // Vérifier si on a reçu les données CSV
            const isReady = content.includes('ClientAccountID') && 
                           (content.includes('DateTime') || content.includes('TradeDate'))

            // Vérifier si le rapport est encore en cours de génération
            const isGenerating = content.includes('Statement generation in progress')

            return {
                success: true,
                ready: isReady,
                generating: isGenerating,
                data: isReady ? content : null
            }

        } else {
            throw createError({
                statusCode: 400,
                message: 'Invalid action. Must be "sendRequest" or "getStatement"'
            })
        }

    } catch (error: unknown) {
        console.error('IBKR Flex Query API error:', error)
        
        const err = error as { statusCode?: number; message?: string }
        
        if (err.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            message: err.message || 'Failed to communicate with IBKR API'
        })
    }
})
