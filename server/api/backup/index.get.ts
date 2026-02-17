import { createBackup } from '~/server/utils/myexport'
import { createAppError } from '../../utils/errors'
import { validateSchemaExists } from '../../utils/db'

export default defineEventHandler(async (event) => {
    await auth(event)
    
    try {
        const userId = Number(event.context.userId)
        const dbName = event.context.dbName as string
        
        if (!userId || !dbName) {
            throw createAppError({
                statusCode: 400,
                message: 'No database selected',
                tag: 'api.backup.import.no_database'
            })
        }
        
        // Validate that the database exists in the auth database
        await validateSchemaExists(userId, dbName)

        try {
            // Création de la sauvegarde
            const backupPath = await createBackup(userId, dbName)
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

        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
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
