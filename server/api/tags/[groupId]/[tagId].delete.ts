import { PrismaClientKnownRequestError } from '~/generated/prisma/internal/prismaNamespace'
import { prisma } from '../../../utils/prisma'
import auth from '../../../utils/auth'
import { z } from 'zod'
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
                tag: 'api.tags.tag.delete.invalid_group_id'
            })
        }

        const tagId = Number(event.context.params?.tagId)

        // Récupération du flag deleteAssoc du body
        const body = await readBody(event)
        const schema = z.object({
            deleteAssoc: z.boolean().optional().default(false)
        })
        const { deleteAssoc } = schema.parse(body)

        if (!tagId || isNaN(tagId)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid tag ID',
                tag: 'api.tags.tag.delete.invalid_tag_id'
            })
        }

        if (deleteAssoc) {
            await prisma.tradeTagAssociation.deleteMany({
                where: { tagId }
            })

            await prisma.dayTagAssociation.deleteMany({
                where: { tagId }
            })
        }

        await prisma.tag.delete({ where: { id: tagId, groupId } })

        return {
            success: true,
            deleteAssoc,
            message: 'Tag deleted successfully'
        }

    } catch (error) {

        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error

        // Gestion des erreurs de contrainte de clé étrangère
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2003') {
            throw createAppError({
                statusCode: 400,
                message: 'Cannot delete tag because it is being used',
                tag: 'api.tags.tag.delete.used_tag',
                error
            })
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while deleting the tag',
            tag: 'api.tags.tag.delete.server_error',
            error
        })
    }
})
