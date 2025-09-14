import { unlink, stat, access, constants } from 'node:fs/promises'
import { join } from 'node:path'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification
    
    try {

        const { file } = getQuery(event)

        // Vérification du paramètre de fichier
        if (typeof file !== 'string' || !file.endsWith('.zip')) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid backup file',
                tag: 'api.backup.import.download.delete.invalid_file'
            })
        }

        const exportDir = join(process.cwd(), 'temp/exports')
        const filePath = join(exportDir, file)

        // Vérifier que le chemin est bien dans le répertoire autorisé
        if (!filePath.startsWith(exportDir)) {
            console.warn(`Attempted path traversal detected: ${filePath}`)
            throw createAppError({
                statusCode: 403,
                message: 'Access to backup file denied',
                tag: 'api.backup.import.download.delete.access_denied'
            })
        }

        try {
            // Vérifier que le fichier existe et est accessible
            try {
                await access(filePath, constants.R_OK | constants.W_OK)
                const stats = await stat(filePath)

                if (!stats.isFile()) {
                    throw createAppError({
                        statusCode: 400,
                        message: 'Not a valid backup file',
                        tag: 'api.backup.import.download.delete.invalid_file'
                    })
                }

                // Supprimer le fichier
                await unlink(filePath)
                console.log(`Backup file deleted: ${filePath}`)

                return {
                    success: true,
                    message: 'Backup deleted successfully',
                    tag: 'api.backup.import.download.delete.success',
                    data: {
                        status: 'success',
                        filename: file,
                        path: filePath,
                        deletedAt: new Date().toISOString()
                    }
                }
            } catch (error) {
                console.error(`Error accessing/deleting file ${filePath}:`, error)
                throw error // Laisser le bloc catch suivant gérer cette erreur
            }

        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                console.warn(`Backup file not found: ${filePath}`)
                throw createAppError({
                    statusCode: 404,
                    message: 'Backup file not found',
                    tag: 'api.backup.import.download.delete.not_found'
                })
            }

            // Si c'est déjà une erreur gérée, la propager
            const appError = error as { statusCode?: number; tag?: string }
            if (appError.statusCode && appError.tag) {
                throw error
            }

            // Autre erreur inattendue
            console.error(`Unexpected error deleting backup ${filePath}:`, error)
            throw error // Laisser le bloc catch principal gérer cette erreur
        }

    } catch (error) {

        const err = error as { statusCode?: number; tag?: string }
        if (err.statusCode && err.tag) {
            throw error
        }

        // Erreur serveur générique
        throw createAppError({
            statusCode: 500,
            message: 'Failed to delete backup',
            tag: 'api.backup.import.download.delete.failed',
            error
        })
    }
})
