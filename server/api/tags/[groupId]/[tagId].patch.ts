import { Prisma } from '~/generated/prisma-data'
import { UpdateTagSchema } from '~/schema/tag'
import { createAppError } from '../../../utils/errors'
import { getApiContext, getValidatedId, parseBody } from '../../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        const groupId = getValidatedId(event, 'groupId', 'api.tags.tag.update.invalid_group_id')

        const tagId = getValidatedId(event, 'tagId', 'api.tags.tag.update.invalid_tag_id')

        const parsed = await parseBody(event, UpdateTagSchema)

        const { id: _, ...updateData } = parsed

        const tag = await prisma.tag.update({
            where: { id: tagId, groupId },
            data: updateData
        })

        return {
            ...tag,
            message: 'Tag updated successfully'
        }

    } catch (error) {

        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        // Gestion des erreurs de contrainte d'unicité
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw createAppError({
                statusCode: 400,
                message: 'A tag with this name already exists in this group',
                tag: 'api.tags.tag.update.tag_exists',
                error
            })
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while updating the tag',
            tag: 'api.tags.tag.update.server_error',
            error
        })
    }

})
