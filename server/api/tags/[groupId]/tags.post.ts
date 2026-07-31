import { Prisma } from '~/generated/prisma-data'
import { CreateTagSchema } from '~/schema/tag'
import { createAppError } from '../../../utils/errors'
import { getApiContext, getValidatedId, parseBody } from '../../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        const groupId = getValidatedId(event, 'groupId', 'api.tags.tag.create.invalid_group_id')

        const input = await parseBody(event, CreateTagSchema)
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
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        // Gestion des erreurs de contrainte d'unicité
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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
