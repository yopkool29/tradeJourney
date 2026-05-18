export const useFix = () => {
    const { log_info, log_error } = useLogView()

    const fixNegativeCommissions = async () => {
        try {
            log_info('Démarrage de la correction des commissions négatives...')
            
            const result = await $fetch('/api/fix/negative-commissions', {
                method: 'POST'
            })
            
            log_info(`✅ Correction terminée : ${result.updated} trades mis à jour`)
            return result
        } catch (error: unknown) {
            const err = error as { data?: { message?: string }; message?: string }
            const message = err?.data?.message || err?.message || 'Erreur lors de la correction des commissions'
            log_error(`❌ ${message}`)
            throw error
        }
    }

    const fixImageUrls = async () => {
        try {
            log_info('Migration des URLs d\'images - Dry Run...')

            const result = await $fetch('/api/fix/image-urls', {
                method: 'POST',
                body: { dryRun: true }
            })

            log_info(`Dry Run: ${result.message}`)

            if (result.dryRun && result.stats.total > 0) {
                log_info('Migration disponible - application en cours...')
                const applyResult = await $fetch('/api/fix/image-urls', {
                    method: 'POST',
                    body: { dryRun: false }
                })
                log_info(`✅ Migration appliquée: ${applyResult.message}`)
                return applyResult
            } else if (result.stats.total === 0) {
                log_info('Aucune migration nécessaire')
            }

            return result
        } catch (error: unknown) {
            const err = error as { data?: { message?: string }; message?: string }
            const message = err?.data?.message || err?.message || 'Erreur lors de la migration des URLs'
            log_error(`❌ ${message}`)
            throw error
        }
    }

    return {
        fixNegativeCommissions,
        fixImageUrls
    }
}
