import { getPrisma } from '../../utils/db'
import { Prisma } from '~/generated/prisma-data'
import auth from '../../utils/auth'
import { UpdateTagGroupSchema } from '~/schema/tagGroup'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        
        const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

        const id = Number(event.context.params?.id)

        if (!id || isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid ID',
                tag: 'api.tags.update.invalid_id'
            })
        }

        const body = await readBody(event)

        // Si 'order' est passé, on le merge dans metadata côté serveur
        if (body.order !== undefined) {
            const existing = await prisma.tagGroup.findUnique({ where: { id }, select: { metadata: true } })
            const currentMetadata = (existing?.metadata as Record<string, unknown>) ?? {}
            const group = await prisma.tagGroup.update({
                where: { id },
                data: {
                    metadata: { ...currentMetadata, order: body.order }
                }
            })
            return { ...group, message: 'Tag group updated successfully' }
        }

        const parsed = UpdateTagGroupSchema.parse({ ...body, id })

        const { id: _, ...updateData } = parsed

        const group = await prisma.tagGroup.update({
            where: { id },
            data: updateData
        })

        return {
            ...group,
            message: 'Tag group updated successfully'
        }

    } catch (error) {

        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw err
        }
        // Gestion des erreurs de contrainte d'unicité
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw createAppError({
                statusCode: 400,
                message: 'A tag group with this name already exists',
                tag: 'api.tags.update.group_exists'
            })
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while updating the tag group',
            tag: 'api.tags.update.server_error',
            error
        })
    }
})
