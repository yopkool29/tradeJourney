import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        const profileId = Number(event.context.params?.id)

        if (!profileId || isNaN(profileId)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid import profile ID',
                tag: 'api.import_profiles.delete.invalid_id'
            })
        }

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
