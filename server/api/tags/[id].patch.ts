import { PrismaClientKnownRequestError } from '~/generated/prisma/internal/prismaNamespace'
import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { UpdateTagGroupSchema } from '~/schema/tagGroup'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {

        const id = Number(event.context.params?.id)

        if (!id || isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid ID',
                tag: 'api.tags.update.invalid_id'
            })
        }

        const body = await readBody(event)

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

        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error

        // Gestion des erreurs de contrainte d'unicité
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
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
