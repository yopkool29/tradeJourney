import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { stat, access, constants } from 'node:fs/promises'
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
                tag: 'api.backup.download.no_database'
            })
        }
        
        // Validate that the database exists in the auth database
        await validateSchemaExists(userId, dbName)

        const { file } = getQuery(event)

        // Vérification du paramètre de fichier
        if (typeof file !== 'string' || !file.endsWith('.zip')) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid backup file',
                tag: 'api.backup.import.download.invalid_file'
            })
        }

        // User-specific export directory: /temp/exports/user_{userId}/db_{dbName}
        const exportDir = join(process.cwd(), 'temp/exports', `user_${userId}`, `db_${dbName}`)
        const filePath = join(exportDir, file)

        // Vérifier que le chemin est bien dans le répertoire autorisé
        if (!filePath.startsWith(exportDir)) {
            throw createAppError({
                statusCode: 403,
                message: 'Access to backup file denied',
                tag: 'api.backup.import.download.access_denied'
            })
        }

        // Vérifier que le fichier existe et est accessible
        await access(filePath, constants.R_OK)
        const stats = await stat(filePath)

        if (!stats.isFile()) {
            throw createAppError({
                statusCode: 400,
                message: 'Not a valid backup file',
                tag: 'api.backup.import.download.invalid_file'
            })
        }

        // Définir les en-têtes pour le téléchargement
        event.node.res.setHeader('Content-Type', 'application/zip')
        event.node.res.setHeader('Content-Length', stats.size)
        event.node.res.setHeader('Content-Disposition', `attachment; filename="${file}"`)
        event.node.res.setHeader('Cache-Control', 'no-cache')
        event.node.res.statusCode = 200
        event.node.res.statusMessage = 'OK'

        // Renvoyer le flux du fichier
        return sendStream(event, createReadStream(filePath))

    } catch (error) {

        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        // Erreur serveur générique
        throw createAppError({
            statusCode: 500,
            message: 'Failed to download backup',
            tag: 'api.backup.import.download.download_failed',
            error
        })
    }
})
