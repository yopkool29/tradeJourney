import { getPrisma } from '../../../utils/db'
import { Prisma } from '~/generated/prisma-data'
import auth from '../../../utils/auth'
import { z } from 'zod'
import { createAppError } from '../../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)

        const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification
        
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

        // Check if tag is used in import profiles
        const importProfileDayTags = await prisma.importProfileDayTag.findMany({
            where: { tagId },
            include: { importProfile: { select: { id: true, name: true } } }
        })
        const importProfileTradeTags = await prisma.importProfileTradeTag.findMany({
            where: { tagId },
            include: { importProfile: { select: { id: true, name: true } } }
        })
        const usedInImportProfiles = [
            ...importProfileDayTags.map(r => r.importProfile),
            ...importProfileTradeTags.map(r => r.importProfile),
        ]

        if (deleteAssoc) {
            await prisma.tradeTagAssociation.deleteMany({
                where: { tagId }
            })

            await prisma.dayTagAssociation.deleteMany({
                where: { tagId }
            })

            await prisma.importProfileDayTag.deleteMany({
                where: { tagId }
            })

            await prisma.importProfileTradeTag.deleteMany({
                where: { tagId }
            })
        }

        await prisma.tag.delete({ where: { id: tagId, groupId } })

        return {
            success: true,
            deleteAssoc,
            usedInImportProfiles,
            message: 'Tag deleted successfully'
        }

    } catch (error) {

        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        // Gestion des erreurs de contrainte de clé étrangère
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
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
