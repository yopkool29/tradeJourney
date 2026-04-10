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

    return {
        fixNegativeCommissions
    }
}
