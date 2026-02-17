import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)

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
