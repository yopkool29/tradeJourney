import { PrismaClientKnownRequestError } from '~/generated/prisma/internal/prismaNamespace'
import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {

        const id = parseInt(event.context.params?.id || '')

        if (!id || isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid ID',
                tag: 'api.tags.delete.invalid_id'
            })
        }

        const body = await readBody(event)
        const schema = z.object({
            deleteAssoc: z.boolean().optional().default(false)
        })
        const { deleteAssoc } = schema.parse(body)

        // Si deleteAssoc est true, on supprime d'abord les associations
        if (deleteAssoc) {
            // Récupérer tous les tags du groupe
            const tags = await prisma.tag.findMany({
                where: { groupId: id }
            })

            // Supprimer toutes les associations pour ces tags
            if (tags.length > 0) {
                await prisma.tradeTagAssociation.deleteMany({
                    where: { tagId: { in: tags.map(tag => tag.id) } }
                })
            }
        }

        // Supprime le groupe et tous ses tags associés
        await prisma.tag.deleteMany({ where: { groupId: id } })

        await prisma.tagGroup.delete({ where: { id } })

        return {
            success: true,
            message: 'Tag group deleted successfully',
        }

    } catch (error) {

        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error

        // Gestion des erreurs de contrainte de clé étrangère
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2003') {
            throw createAppError({
                statusCode: 400,
                message: 'Cannot delete tag group because it is being used',
                tag: 'api.tags.delete.used_tag'
            })
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while deleting the tag group',
            tag: 'api.tags.delete.server_error',
            error
        })
    }
})
