import { getAuthDb } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'
import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'

interface BackupConfig {
	backupDir?: string
}

interface SettingsBody {
	backupDir?: string
}

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		const userId = parseInt(event.context.userId)
		if (!userId) {
			throw createAppError({
				statusCode: 401,
				message: 'Unauthorized',
				tag: 'api.backup.settings.unauthorized',
			})
		}

		const body = await readBody<SettingsBody>(event)

		// Valider que le répertoire existe si fourni
		if (body.backupDir) {
			const resolved = resolve(body.backupDir)
			if (!existsSync(resolved)) {
				throw createAppError({
					statusCode: 400,
					message: 'Backup directory does not exist',
					tag: 'api.backup.settings.dir_not_found',
				})
			}
			const stats = await stat(resolved)
			if (!stats.isDirectory()) {
				throw createAppError({
					statusCode: 400,
					message: 'Backup path is not a directory',
					tag: 'api.backup.settings.dir_not_dir',
				})
			}
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
				tag: 'api.backup.settings.user_not_found',
			})
		}

		const existingMetadata = (user.metadata as Record<string, unknown> | null) ?? {}
		const existingConfig = (existingMetadata.backupConfig as BackupConfig | undefined) ?? {}

		const newConfig: BackupConfig = {
			backupDir: body.backupDir !== undefined ? (body.backupDir || undefined) : existingConfig.backupDir,
		}

		const updatedMetadata = {
			...existingMetadata,
			backupConfig: newConfig,
		}

		await authDb.user.update({
			where: { id: userId },
			data: { metadata: updatedMetadata },
		})

		return {
			backupDir: newConfig.backupDir ?? '',
		}
	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({
			statusCode: 500,
			message: 'Failed to update backup settings',
			tag: 'api.backup.settings.update_error',
			error,
		})
	}
})
