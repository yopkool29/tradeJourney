import { getAuthDb } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'
import { readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, basename } from 'node:path'

interface BackupConfig {
	backupDir?: string
}

interface ZipEntry {
	filename: string
	size: number
	dbName: string | null
}

// Extract dbName from backup filename: backup-{dbName}-{appVersion}-{date}-{id}.zip
const extractDbNameFromFilename = (filename: string): string | null => {
	const match = filename.match(/^backup-([a-z0-9_]+)-/)
	return match ? match[1] : null
}

// Lists all .zip files in the configured import directory
export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		const userId = parseInt(event.context.userId)
		if (!userId) {
			throw createAppError({
				statusCode: 401,
				message: 'Unauthorized',
				tag: 'api.backup.list_dir.unauthorized',
			})
		}

		const authDb = getAuthDb()
		const user = await authDb.user.findUnique({
			where: { id: userId },
			select: { metadata: true },
		})

		if (!user) {
			throw createAppError({
				statusCode: 404,
				message: 'User not found',
				tag: 'api.backup.list_dir.user_not_found',
			})
		}

		const metadata = user.metadata as Record<string, unknown> | null
		const backupConfig = (metadata?.backupConfig as BackupConfig | undefined) ?? {}

		if (!backupConfig.backupDir) {
			throw createAppError({
				statusCode: 400,
				message: 'Backup directory not configured',
				tag: 'api.backup.list_dir.not_configured',
			})
		}

		const backupDir = resolve(backupConfig.backupDir)
		if (!existsSync(backupDir)) {
			throw createAppError({
				statusCode: 400,
				message: 'Backup directory does not exist',
				tag: 'api.backup.list_dir.dir_not_found',
			})
		}

		const entries = await readdir(backupDir, { withFileTypes: true })
		const zipFiles = entries.filter(e => e.isFile() && e.name.endsWith('.zip'))

		const result: ZipEntry[] = []
		for (const entry of zipFiles) {
			const fullPath = resolve(backupDir, entry.name)
			const stats = await stat(fullPath)
			result.push({
				filename: entry.name,
				size: stats.size,
				dbName: extractDbNameFromFilename(entry.name),
			})
		}

		return { files: result }
	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({
			statusCode: 500,
			message: 'Failed to list import directory',
			tag: 'api.backup.list_dir.error',
			error,
		})
	}
})
