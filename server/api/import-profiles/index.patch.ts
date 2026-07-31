import { createAppError } from '../../utils/errors'
import { getApiContext, parseBody } from '../../utils/apiHelpers'
import { UpdateImportProfileSchema } from '~/schema/importProfile'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)
        const parsed = await parseBody(event, UpdateImportProfileSchema)

        const id = parsed.id

        // Vérifier l'unicité du nom si modifié
        if (parsed.name) {
            const existing = await prisma.importProfile.findFirst({
                where: {
                    name: parsed.name,
                    NOT: { id }
                }
            })

            if (existing) {
                throw createAppError({
                    statusCode: 400,
                    message: 'An import profile with this name already exists',
                    tag: 'api.import_profiles.update.name_exists'
                })
            }
        }

        const { id: _, dayTagIds, tradeTagIds, ...updateFields } = parsed

        const data: Record<string, unknown> = { ...updateFields }

        // Replace junction table entries if tag arrays are provided
        if (dayTagIds !== undefined) {
            data.dayTags = {
                deleteMany: {},
                create: dayTagIds.map((tagId: number) => ({ tagId })),
            }
        }
        if (tradeTagIds !== undefined) {
            data.tradeTags = {
                deleteMany: {},
                create: tradeTagIds.map((tagId: number) => ({ tagId })),
            }
        }

        const updatedProfile = await prisma.importProfile.update({
            where: { id },
            data,
            include: {
                dayTags: { select: { tagId: true } },
                tradeTags: { select: { tagId: true } },
            }
        })

        return updatedProfile

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while updating the import profile',
            tag: 'api.import_profiles.update.server_error',
            error
        })
    }
})
