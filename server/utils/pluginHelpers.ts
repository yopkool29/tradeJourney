import { createAppError } from './errors'

/**
 * Validates a plugin ID to prevent directory traversal attacks
 * @param id - The plugin ID to validate (can be undefined)
 * @throws AppError if the ID is invalid
 */
export function validatePluginId(id: string | undefined): void {
	if (!id) {
		throw createAppError({ statusCode: 400, message: 'Plugin ID required', tag: 'api.plugins.missing_id' })
	}

	// Security: prevent directory traversal
	if (id.includes('..') || id.includes('/')) {
		throw createAppError({ statusCode: 400, message: 'Invalid plugin ID', tag: 'api.plugins.invalid_id' })
	}
}
