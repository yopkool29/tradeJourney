import { readdir, readFile, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import auth from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'
import AdmZip from 'adm-zip'

export default defineEventHandler(async (event) => {
	try {
		await auth(event)

		const form = await readMultipartFormData(event)
		if (!form) {
			throw createAppError({ message: 'Invalid form data', statusCode: 400, tag: 'PLUGIN_IMPORT_INVALID_FORM' })
		}

		const file = form.find(f => f.name === 'file')
		if (!file || !file.data) {
			throw createAppError({ message: 'No file uploaded', statusCode: 400, tag: 'PLUGIN_IMPORT_NO_FILE' })
		}

		// Validate file type
		const filename = file.filename || 'unknown'
		if (!filename.endsWith('.zip')) {
			throw createAppError({ message: 'File must be .zip', statusCode: 400, tag: 'PLUGIN_IMPORT_INVALID_TYPE' })
		}

		// Save temp file
		const tempPath = join(process.cwd(), 'plugins-upload', `.tmp-${Date.now()}.zip`)
		await writeFile(tempPath, file.data)

		// Extract ZIP
		const extractDir = join(process.cwd(), 'plugins-upload')
		const zip = new AdmZip(tempPath)
		zip.extractAllTo(extractDir, true)

		// Find extracted folder (should be pluginId/)
		const entries = await readdir(extractDir, { withFileTypes: true })
		const pluginDir = entries.find(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('tmp-'))
		if (!pluginDir) {
			await unlink(tempPath).catch(() => {})
			throw createAppError({ message: 'Invalid archive structure', statusCode: 400, tag: 'PLUGIN_IMPORT_INVALID_STRUCTURE' })
		}

		const pluginId = pluginDir.name
		const pluginPath = join(extractDir, pluginId)

		// Validate manifest
		try {
			const manifestContent = await readFile(join(pluginPath, 'manifest.json'), 'utf-8')
			const manifest = JSON.parse(manifestContent)
			if (!manifest.id || !manifest.name || !manifest.version) {
				throw new Error('Missing required fields')
			}
		} catch {
			// Clean up invalid extraction
			await unlink(tempPath).catch(() => {})
			throw createAppError({ message: 'Invalid manifest.json', statusCode: 400, tag: 'PLUGIN_IMPORT_INVALID_MANIFEST' })
		}

		// Clean up temp file
		await unlink(tempPath).catch(() => {})

		return {
			success: true,
			pluginId,
			message: `Plugin "${pluginId}" imported successfully`,
		}
	} catch (err) {
		if (err && typeof err === 'object' && 'statusCode' in err) {
			throw err
		}
		console.error('[Plugin Import Error]', err)
		throw createAppError({ message: 'Failed to import plugin', statusCode: 500, tag: 'PLUGIN_IMPORT_ERROR' })
	}
})
