import { getAuthDb } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

interface BackupConfig {
	backupDir?: string
}

// Returns the backup config stored in user.metadata.backupConfig
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

		const metadata = user.metadata as Record<string, unknown> | null
		const backupConfig = (metadata?.backupConfig as BackupConfig | undefined) ?? {}

		return {
			backupDir: backupConfig.backupDir ?? '',
		}
	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({
			statusCode: 500,
			message: 'Failed to get backup settings',
			tag: 'api.backup.settings.get_error',
			error,
		})
	}
})
