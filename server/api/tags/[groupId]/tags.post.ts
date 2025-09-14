import { PrismaClientKnownRequestError } from '~/generated/prisma/internal/prismaNamespace'
import { prisma } from '../../../utils/prisma'
import auth from '../../../utils/auth'
import { CreateTagSchema } from '~/schema/tag'
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
                tag: 'api.tags.tag.create.invalid_group_id'
            })
        }

        const body = await readBody(event)
        const input = CreateTagSchema.parse(body)
        const tag = await prisma.tag.create({
            data: {
                groupId: groupId,
                name: input.name,
                color: input.color,
                dark_fg_reverse: input.dark_fg_reverse,
                description: input.description
            }
        })

        return {
            ...tag,
            message: 'Tag created successfully'
        }

    } catch (error) {
        // Si c'est déjà une AppError, on la propage
        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error

        // Gestion des erreurs de contrainte d'unicité
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
            throw createAppError({
                statusCode: 400,
                message: 'A tag with this name already exists in this group',
                tag: 'api.tags.tag.create.tag_exists'
            })
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while creating the tag',
            tag: 'api.tags.tag.create.server_error',
            error
        })
    }
})
