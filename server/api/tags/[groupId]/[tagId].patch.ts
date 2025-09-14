import { PrismaClientKnownRequestError } from '~/generated/prisma/internal/prismaNamespace'
import { prisma } from '../../../utils/prisma'
import auth from '../../../utils/auth'
import { UpdateTagSchema } from '~/schema/tag'
import { createAppError } from '../../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {

        const groupId = Number(event.context.params?.groupId)

        if (!groupId || isNaN(groupId)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid group ID',
                tag: 'api.tags.tag.update.invalid_group_id'
            })
        }

        const tagId = Number(event.context.params?.tagId)

        if (!tagId || isNaN(tagId)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid tag ID',
                tag: 'api.tags.tag.update.invalid_tag_id'
            })
        }

        const body = await readBody(event)

        const parsed = UpdateTagSchema.parse(body)

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

        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error

        // Gestion des erreurs de contrainte d'unicité
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
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
