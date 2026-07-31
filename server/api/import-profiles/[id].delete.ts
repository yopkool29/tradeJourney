import { createAppError } from '../../utils/errors'
import { getApiContext, getValidatedId } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)
        const profileId = getValidatedId(event, 'id', 'api.import_profiles.delete.invalid_id')

        await prisma.importProfile.delete({
            where: { id: profileId }
        })

        return {
            success: true,
            message: 'Import profile successfully deleted',
        }

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while deleting the import profile',
            tag: 'api.import_profiles.delete.server_error',
            error
        })
    }
})
