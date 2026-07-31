import { createAppError } from '../../utils/errors'
import { getApiContext } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        const profiles = await prisma.importProfile.findMany({
            orderBy: { createdAt: 'asc' },
            include: {
                dayTags: { select: { tagId: true } },
                tradeTags: { select: { tagId: true } },
            }
        })

        return profiles

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while retrieving import profiles',
            tag: 'api.import_profiles.list.server_error',
            error
        })
    }
})
