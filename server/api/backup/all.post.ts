import { restoreBackup } from '~/server/utils/myexport'
import { getAuthDb, buildShemaName, buildRoleName, createUserDatabase } from '~/server/utils/db'
import { createAppError } from '../../utils/errors'
import { readdir, rm, mkdtemp, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import extract from 'extract-zip'

interface BackupConfig {
	backupDir?: string
}

interface ImportBody {
	files: string[]
}

// Extract dbName from backup filename: backup-{dbName}-{appVersion}-{date}-{id}.zip
const extractDbNameFromFilename = (filename: string): string | null => {
	const match = filename.match(/^backup-([a-z0-9_]+)-/)
	return match ? match[1] : null
}

// Extract dbName from the manifest inside the zip (fallback)
const extractDbNameFromManifest = async (zipPath: string): Promise<string | null> => {
	const tempDir = await mkdtemp(join(tmpdir(), 'restore-all-'))
	try {
		await extract(zipPath, { dir: tempDir })
		const manifestPath = join(tempDir, 'manifest.json')
		if (!existsSync(manifestPath)) return null
		const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'))
		if (manifest.metadata?.dbName) {
			return manifest.metadata.dbName
		}
		return null
	} catch {
		return null
	} finally {
		await rm(tempDir, { recursive: true, force: true })
	}
}

// Delete an existing database (schema + role + record + upload dir)
const deleteExistingDatabase = async (userId: number, dbName: string) => {
	const authDb = getAuthDb()
	const schemaName = buildShemaName(userId, dbName)
	const roleName = buildRoleName(userId, dbName)

	try {
		await authDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
		await authDb.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`)
	} catch (e) {
		console.error(`Failed to drop schema/role for "${dbName}":`, e instanceof Error ? e.message : e)
	}

	const existing = await authDb.database.findFirst({
		where: { userId, name: dbName },
	})
	if (existing) {
		try {
			await authDb.database.delete({ where: { id: existing.id } })
		} catch {
			// Record may not exist
		}
	}

	// Delete upload directory
	const uploadPath = join(process.cwd(), 'upload', `user_${userId}_data`, dbName)
	if (existsSync(uploadPath)) {
		try {
			await rm(uploadPath, { recursive: true, force: true })
		} catch (error) {
			console.error(`Failed to delete upload directory for "${dbName}":`, error)
		}
	}

	// Delete export directory
	const exportPath = join(process.cwd(), 'temp', 'exports', `user_${userId}`, `db_${dbName}`)
	if (existsSync(exportPath)) {
		try {
			await rm(exportPath, { recursive: true, force: true })
		} catch (error) {
			console.error(`Failed to delete export directory for "${dbName}":`, error)
		}
	}
}

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		const userId = Number(event.context.userId)

		if (!userId) {
			throw createAppError({
				statusCode: 401,
				message: 'Unauthorized',
				tag: 'api.backup.all.import.unauthorized',
			})
		}

		// Récupérer la config depuis user.metadata
		const authDb = getAuthDb()
		const user = await authDb.user.findUnique({
			where: { id: userId },
			select: { metadata: true },
		})

		if (!user) {
			throw createAppError({
				statusCode: 404,
				message: 'User not found',
				tag: 'api.backup.all.import.user_not_found',
			})
		}

		const metadata = user.metadata as Record<string, unknown> | null
		const backupConfig = (metadata?.backupConfig as BackupConfig | undefined) ?? {}

		if (!backupConfig.backupDir) {
			throw createAppError({
				statusCode: 400,
				message: 'Backup directory not configured',
				tag: 'api.backup.all.import.dir_not_configured',
			})
		}

		const backupDir = resolve(backupConfig.backupDir)
		if (!existsSync(backupDir)) {
			throw createAppError({
				statusCode: 400,
				message: 'Backup directory does not exist',
				tag: 'api.backup.all.import.dir_not_found',
			})
		}

		const body = await readBody<ImportBody>(event)
		if (!body?.files || !Array.isArray(body.files) || body.files.length === 0) {
			throw createAppError({
				statusCode: 400,
				message: 'No files specified',
				tag: 'api.backup.all.import.no_files',
			})
		}

		// Valider que les fichiers existent dans le répertoire de backup
		// et qu'ils sont bien des .zip dans ce répertoire (sécurité: pas de path traversal)
		const dirEntries = await readdir(backupDir, { withFileTypes: true })
		const dirZipFiles = new Set(dirEntries.filter(e => e.isFile() && e.name.endsWith('.zip')).map(e => e.name))

		const filesToRestore = body.files.filter(f => dirZipFiles.has(f))
		if (filesToRestore.length === 0) {
			throw createAppError({
				statusCode: 400,
				message: 'No valid zip files found in import directory',
				tag: 'api.backup.all.import.no_valid_files',
			})
		}

		const results: { dbName: string; filename: string; success: boolean; error?: string }[] = []

		for (const filename of filesToRestore) {
			const zipPath = resolve(backupDir, filename)
			let dbName = extractDbNameFromFilename(filename)

			try {
				// Fallback: extract dbName from manifest if not in filename
				if (!dbName) {
					dbName = await extractDbNameFromManifest(zipPath)
				}

				if (!dbName) {
					throw new Error(`Could not determine database name from "${filename}"`)
				}

				// Delete existing database if it exists
				const existing = await authDb.database.findFirst({
					where: { userId, name: dbName },
				})
				if (existing) {
					console.log(`Deleting existing database "${dbName}" before restore...`)
					await deleteExistingDatabase(userId, dbName)
				}

				// Create the database (schema + role + record + migrations)
				console.log(`Creating database "${dbName}"...`)
				await createUserDatabase(userId, dbName, dbName)

				// Restore the backup
				console.log(`Restoring backup to "${dbName}"...`)
				await restoreBackup(zipPath, userId, dbName)

				results.push({ dbName, filename, success: true })
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error)
				console.error(`Failed to restore "${filename}":`, errorMsg)
				results.push({ dbName: dbName || 'unknown', filename, success: false, error: errorMsg })
			}
		}

		const succeeded = results.filter(r => r.success).length
		const failed = results.filter(r => !r.success).length

		return {
			success: failed === 0,
			results,
			summary: {
				total: results.length,
				succeeded,
				failed,
			},
		}
	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({
			statusCode: 500,
			message: 'Failed to import backups',
			tag: 'api.backup.all.import.failed',
			error,
		})
	}
})
