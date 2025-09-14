import { readdir, stat, access, constants } from 'node:fs/promises'
import { join } from 'node:path'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification
    
    try {

        const exportDir = join(process.cwd(), 'temp/exports')

        try {
            // Vérifier que le répertoire des exports est accessible
            await access(exportDir, constants.R_OK)
        } catch (error) {
            // Si le répertoire n'existe pas, retourner une liste vide
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                return {
                    success: true,
                    backups: [],
                    message: 'No backup files found',
                    tag: 'api.backup.import.download.no_backups',
                    data: {
                        status: 'success',
                        count: 0
                    }
                }
            }

            // Autre erreur d'accès
            console.error('Failed to access backup directory:', error)
            throw createAppError({
                statusCode: 500,
                message: 'Failed to access backup directory',
                tag: 'api.backup.import.download.list_failed',
                error: error instanceof Error ? error.message : String(error),
                data: { status: 'error' }
            })
        }

        try {
            const files = await readdir(exportDir)

            // Filtrer et traiter uniquement les fichiers .zip
            const backupPromises = files
                .filter(f => f.endsWith('.zip'))
                .map(async f => {
                    try {
                        // Format attendu: backup-YYYY-MM-DD-HH-MM.zip
                        const dateMatch = f.match(/backup-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})(?:-|$)/)

                        if (!dateMatch) {
                            console.warn(`Invalid backup file name format: ${f}`)
                            return null
                        }

                        const [_, year, month, day, hours, minutes] = dateMatch

                        // Valider la date
                        const date = new Date(
                            parseInt(year, 10),
                            parseInt(month, 10) - 1, // Les mois commencent à 0 en JS
                            parseInt(day, 10),
                            parseInt(hours, 10),
                            parseInt(minutes, 10)
                        )

                        // Vérifier que la date est valide
                        if (isNaN(date.getTime())) {
                            console.warn(`Invalid date in backup file: ${f}`)
                            return null
                        }

                        // Format ISO 8601 pour l'affichage
                        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
                        const filePath = join(exportDir, f)

                        // Vérifier que le fichier est accessible
                        await access(filePath, constants.R_OK)
                        const fileStat = await stat(filePath)

                        return {
                            name: f,
                            path: filePath,
                            url: `/api/backup/download?file=${encodeURIComponent(f)}`,
                            timestamp: formattedDate,
                            timestampMs: date.getTime(),
                            size: fileStat.size // Taille en octets
                        }
                    } catch (error) {
                        console.warn(`Error processing backup file ${f}:`, error)
                        return null
                    }
                })

            // Attendre que toutes les promesses soient résolues et filtrer les erreurs
            const backups = (await Promise.all(backupPromises))
                .filter((backup): backup is NonNullable<typeof backup> => backup !== null)
                .sort((a, b) => b.timestampMs - a.timestampMs) // Tri par timestamp numérique décroissant

            const response = {
                success: true,
                backups,
                data: {
                    status: 'success',
                    count: backups.length,
                    totalSize: backups.reduce((sum, backup) => sum + (backup?.size || 0), 0)
                }
            }

            // Ajout d'un message si la liste est vide
            if (backups.length === 0) {
                return {
                    ...response,
                    message: 'No backup files found',
                    tag: 'api.backup.import.download.no_backups'
                }
            }

            return response

        } catch (error) {
            console.error('Error reading backup directory:', error)
            throw createAppError({
                statusCode: 500,
                message: 'Failed to list backup files',
                tag: 'api.backup.import.download.list_failed',
                error
            })
        }

    } catch (error) {

        const err = error as { statusCode?: number; tag?: string }
        if (err.statusCode && err.tag) {
            throw error
        }

        // Erreur serveur générique
        throw createAppError({
            statusCode: 500,
            message: 'Failed to process backup list request',
            tag: 'api.backup.import.download.list_failed',
            error
        })
    }
})
