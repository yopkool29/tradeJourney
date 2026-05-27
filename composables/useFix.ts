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

    const fixImageUrls = async (dryRun: boolean = true) => {
        try {
            const mode = dryRun ? 'Dry Run' : 'Full'
            log_info(`Migration des URLs d\'images - ${mode}...`)

            const result = await $fetch('/api/fix/image-urls', {
                method: 'POST',
                body: { dryRun }
            })

            log_info(`${mode}: ${result.message}`)

            if (!dryRun) {
                log_info(`✅ Migration appliquée: ${result.stats?.tradesUpdated || 0} trades, ${result.stats?.notesUpdated || 0} notes`)
            } else if (result.stats?.total > 0) {
                log_info(`${result.stats.total} migrations disponibles (cliquer [F] pour appliquer)`)
            } else {
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

    const cleanupOrphanImages = async (dryRun: boolean = true) => {
        try {
            const mode = dryRun ? 'Dry Run' : 'Full'
            log_info(`Nettoyage des images orphelines - ${mode}...`)

            const result = await $fetch('/api/fix/cleanup-orphan-images', {
                method: 'POST',
                body: { dryRun }
            })

            log_info(`${mode}: ${result.message}`)
            log_info(`Fichiers: total=${result.stats.totalFiles}, images=${result.stats.totalImageFiles}, non-images=${result.stats.nonImageFiles}`)
            if (result.nonImageFiles?.length > 0) {
                log_info(`Non-images trouvés: ${result.nonImageFiles.join(', ')}`)
            }
            log_info(`Référencés: notes=${result.stats.referencedFromNotes}, trades=${result.stats.referencedFromTrades}, detailedNotes=${result.stats.referencedFromDetailedNotes} (total=${result.stats.referencedFiles}) | Orphelins: ${result.stats.orphanFiles}`)
            if (result.orphanFiles?.length > 0) {
                log_info(`Orphelins: ${result.orphanFiles.slice(0, 10).join(', ')}${result.orphanFiles.length > 10 ? '...' : ''}`)
            }

            if (!dryRun && result.stats.orphanFiles > 0) {
                log_info(`✅ Nettoyage appliqué: ${result.stats.deleted} images supprimées`)
            } else if (dryRun && result.stats.orphanFiles > 0) {
                log_info(`${result.stats.orphanFiles} orphelins trouvés (cliquer [F] pour supprimer)`)
            } else if (result.stats.orphanFiles === 0) {
                log_info('Aucune image orpheline à nettoyer')
            }

            return result
        } catch (error: unknown) {
            const err = error as { data?: { message?: string }; message?: string }
            const message = err?.data?.message || err?.message || 'Erreur lors du nettoyage des images'
            log_error(`❌ ${message}`)
            throw error
        }
    }

    return {
        fixNegativeCommissions,
        fixImageUrls,
        cleanupOrphanImages
    }
}
