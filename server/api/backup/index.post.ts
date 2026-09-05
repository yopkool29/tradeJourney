import { defineEventHandler, readMultipartFormData } from 'h3'
import { writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { restoreBackup } from '~/server/utils/myexport'
import { formatDateForFilename } from '~/utils/date-utils'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const MAX_FILE_SIZE = config.public.maxFileSize

    await auth(event)

    try {

        const userId = parseInt(event.context.userId)

        const dbName = event.context.dbName
        
        if (!dbName) {
            throw createAppError({
                statusCode: 400,
                message: 'No database selected',
                tag: 'api.backup.import.no_database'
            })
        }

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
            throw createAppError({
                statusCode: 413,
                message: `The file is too large (max ${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
                tag: 'api.backup.import.file_too_large',
            })
        }

        // Sauvegarder le fichier temporairement avec une date formatée
        const formattedDate = formatDateForFilename()
        const tempPath = join(tmpdir(), `backup-${formattedDate}.zip`)

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
            await restoreBackup(tempPath, userId, dbName)
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

        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
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
