import { mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'
import { getPluginUploadPath } from '~/server/utils/index'
import { getDataDb } from '~/server/utils/db'
import AdmZip from 'adm-zip'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const userId = event.context.userId as number

        if (!userId) {
            throw createAppError({ statusCode: 401, message: 'Unauthorized', tag: 'api.plugins.unauthorized' })
        }

        const dbName = event.context.dbName as string | undefined

        if (!dbName) {
            throw createAppError({ message: 'No database selected', statusCode: 400, tag: 'PLUGIN_IMPORT_NO_DATABASE' })
        }

        const form = await readMultipartFormData(event)
        if (!form) {
            throw createAppError({ message: 'Invalid form data', statusCode: 400, tag: 'PLUGIN_IMPORT_INVALID_FORM' })
        }

        const file = form.find(f => f.name === 'file')
        if (!file || !file.data) {
            throw createAppError({ message: 'No file uploaded', statusCode: 400, tag: 'PLUGIN_IMPORT_NO_FILE' })
        }

        const filename = file.filename || 'unknown'
        if (!filename.endsWith('.zip')) {
            throw createAppError({ message: 'File must be .zip', statusCode: 400, tag: 'PLUGIN_IMPORT_INVALID_TYPE' })
        }

        const uploadDir = resolve(process.cwd(), getPluginUploadPath(userId, dbName))
        await mkdir(uploadDir, { recursive: true })
        const tempPath = join(uploadDir, `.tmp-${Date.now()}.zip`)
        await writeFile(tempPath, file.data)

        const zip = new AdmZip(tempPath)

        const zipEntries = zip.getEntries()
        const firstEntry = zipEntries[0]
        if (!firstEntry) {
            await unlink(tempPath).catch(() => { })
            throw createAppError({ message: 'Invalid archive structure', statusCode: 400, tag: 'PLUGIN_IMPORT_INVALID_STRUCTURE' })
        }

        const pluginId = firstEntry.entryName.split('/')[0]
        if (!pluginId) {
            await unlink(tempPath).catch(() => { })
            throw createAppError({ message: 'Invalid archive structure', statusCode: 400, tag: 'PLUGIN_IMPORT_INVALID_STRUCTURE' })
        }
        zip.extractAllTo(uploadDir, true)
        const pluginPath = join(uploadDir, pluginId)

        try {
            const manifestContent = await readFile(join(pluginPath, 'manifest.json'), 'utf-8')
            const manifest = JSON.parse(manifestContent)
            if (!manifest.id || !manifest.name || !manifest.version) {
                throw new Error('Missing required fields')
            }
        } catch {
            await unlink(tempPath).catch(() => { })
            throw createAppError({ message: 'Invalid manifest.json', statusCode: 400, tag: 'PLUGIN_IMPORT_INVALID_MANIFEST' })
        }

        await unlink(tempPath).catch(() => { })

        const manifestContent = await readFile(join(pluginPath, 'manifest.json'), 'utf-8')
        const manifest = JSON.parse(manifestContent)

        const metadata = {
            pluginVersion: manifest.version,
            pluginSystemVersion: manifest.pluginSystemVersion || 'unknown',
            importedAt: new Date().toISOString(),
        }

        const prisma = await getDataDb(userId, dbName)
        await prisma.plugin.upsert({
            where: { id: pluginId },
            create: {
                id: pluginId,
                name: manifest.name,
                version: manifest.version,
                description: manifest.description,
                metadata,
                enabled: false,
            },
            update: {
                name: manifest.name,
                version: manifest.version,
                description: manifest.description,
                metadata,
            },
        })

        return {
            success: true,
            pluginId,
            message: `Plugin "${pluginId}" imported successfully`,
        }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({ message: 'Failed to import plugin', statusCode: 500, tag: 'PLUGIN_IMPORT_ERROR', error })
    }
})
