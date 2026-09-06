import { createBackup } from '~/server/utils/myexport'
import { getAuthDb } from '~/server/utils/db'
import { createAppError } from '../../utils/errors'
import { copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

interface BackupConfig {
	backupDir?: string
}

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		const userId = Number(event.context.userId)

		if (!userId) {
			throw createAppError({
				statusCode: 401,
				message: 'Unauthorized',
				tag: 'api.backup.all.unauthorized',
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
				tag: 'api.backup.all.user_not_found',
			})
		}

		const metadata = user.metadata as Record<string, unknown> | null
		const backupConfig = (metadata?.backupConfig as BackupConfig | undefined) ?? {}

		if (!backupConfig.backupDir) {
			throw createAppError({
				statusCode: 400,
				message: 'Backup directory not configured',
				tag: 'api.backup.all.backup_dir_not_configured',
			})
		}

		const backupDir = resolve(backupConfig.backupDir)
		if (!existsSync(backupDir)) {
			throw createAppError({
				statusCode: 400,
				message: 'Backup directory does not exist',
				tag: 'api.backup.all.backup_dir_not_found',
			})
		}

		// Filtrer par DB sélectionnées si le paramètre est fourni
		const { dbNames } = getQuery(event)
		const selectedNames = typeof dbNames === 'string'
			? dbNames.split(',').filter(Boolean)
			: Array.isArray(dbNames)
				? dbNames.filter(Boolean)
				: null

		const databases = await authDb.database.findMany({
			where: { userId },
			orderBy: [
				{ updatedAt: 'desc' },
			],
		})

		// Filtrer les DB à exporter
		const dbsToBackup = selectedNames
			? databases.filter(db => selectedNames.includes(db.name))
			: databases

		if (dbsToBackup.length === 0) {
			return {
				success: true,
				backups: [],
				backupDir,
			}
		}

		const appVersion = useRuntimeConfig().public.appTagVersion
		const results: { dbName: string; displayName: string; success: boolean; filename?: string; error?: string }[] = []

		for (const db of dbsToBackup) {
			try {
				const backupPath = await createBackup(userId, db.name, appVersion)
				const backupName = backupPath.split('/').pop()

				if (!backupName) {
					throw new Error('Failed to determine backup filename')
				}

				// Copier le zip vers le répertoire de backup configuré
				const destPath = join(backupDir, backupName)
				await copyFile(backupPath, destPath)

				results.push({
					dbName: db.name,
					displayName: db.displayName,
					success: true,
					filename: backupName,
				})
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error)
				console.error(`Failed to backup "${db.name}":`, errorMsg)
				results.push({
					dbName: db.name,
					displayName: db.displayName,
					success: false,
					error: errorMsg,
				})
			}
		}

		const succeeded = results.filter(r => r.success).length
		const failed = results.filter(r => !r.success).length

		return {
			success: failed === 0,
			backups: results,
			backupDir,
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
			message: 'Failed to create backups',
			tag: 'api.backup.all.create_failed',
			error,
		})
	}
})
