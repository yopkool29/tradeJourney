import { Prisma } from '~/generated/prisma-data'
import { z } from 'zod'
import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        
        const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

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
                const tagIds = tags.map(tag => tag.id)
                await prisma.tradeTagAssociation.deleteMany({
                    where: { tagId: { in: tagIds } }
                })
                await prisma.dayTagAssociation.deleteMany({
                    where: { tagId: { in: tagIds } }
                })
                await prisma.importProfileDayTag.deleteMany({
                    where: { tagId: { in: tagIds } }
                })
                await prisma.importProfileTradeTag.deleteMany({
                    where: { tagId: { in: tagIds } }
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

        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw err
        }

        // Gestion des erreurs de contrainte de clé étrangère
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
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
