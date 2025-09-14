import { defineEventHandler, readMultipartFormData } from 'h3'
import { writeFile, rm } from 'node:fs/promises'
import { restoreBackup } from '~/server/utils/myexport'
import { formatDateForFilename } from '~/utils'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const MAX_FILE_SIZE = config.public.maxFileSize

    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {

        const files = await readMultipartFormData(event)
        const file = files?.find(f => f.name === 'backup')

        if (!file) {
            throw createAppError({
                statusCode: 400,
                message: 'No backup file provided',
                tag: 'api.backup.import.no_file',
            })
        }

        // Vérifier la taille du fichier
        if (file.data.length > MAX_FILE_SIZE) {
            const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)
            throw createAppError({
                statusCode: 413,
                message: 'The file is too large',
                tag: 'api.backup.import.file_too_large',
            })
        }

        // Sauvegarder le fichier temporairement avec une date formatée
        const formattedDate = formatDateForFilename()
        const tempPath = `/tmp/backup-${formattedDate}.zip`

        try {
            await writeFile(tempPath, file.data)
        } catch (error) {
            console.error('Failed to write temporary backup file:', error)
            throw createAppError({
                statusCode: 500,
                message: 'Failed to process backup file',
                tag: 'api.backup.import.process_failed',
                error: error instanceof Error ? error.message : String(error),
            })
        }

        // Restaurer à partir de la sauvegarde
        try {
            await restoreBackup(tempPath)
        } catch (error) {
            console.error('Failed to restore backup:', error)
            throw createAppError({
                statusCode: 500,
                message: 'Failed to import backup',
                tag: 'api.backup.import.import_failed',
                error: error instanceof Error ? error.message : String(error),
            })
        } finally {
            // Nettoyage
            try {
                await rm(tempPath, { force: true })
            } catch (cleanupError) {
                console.warn('Failed to clean up temporary file:', cleanupError)
                // On ne propage pas l'erreur de nettoyage
            }
        }

        return {
            success: true,
            message: 'Backup imported successfully'
        }

    } catch (error) {

        const err = error as { statusCode?: number; tag?: string }
        if (err.statusCode && err.tag) {
            throw error
        }

        // Erreur serveur générique
        throw createAppError({
            statusCode: 500,
            message: 'Failed to import backup',
            tag: 'api.backup.import.import_failed',
            error
        })
    }
})
