import { createBackup } from '~/server/utils/myexport'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification
    
    try {

        try {
            // Création de la sauvegarde
            const backupPath = await createBackup()
            const backupName = backupPath.split('/').pop()

            if (!backupName) {
                throw new Error('Failed to determine backup filename')
            }

            return {
                success: true,
                message: 'Backup created successfully',
                tag: 'api.backup.import.create_success',
                downloadUrl: `/api/backup/download?file=${encodeURIComponent(backupName)}`,
                filename: backupName,
                data: {
                    status: 'success',
                    filename: backupName
                }
            }
        } catch (error) {
            console.error('Failed to create backup:', error)
            throw createAppError({
                statusCode: 500,
                message: 'Failed to create backup',
                tag: 'api.backup.import.create_failed',
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
            message: 'Failed to create backup',
            tag: 'api.backup.import.create_failed',
            error
        })
    }
})
