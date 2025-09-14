import { PrismaClientKnownRequestError } from '~/generated/prisma/internal/prismaNamespace'
import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { CreateTagGroupSchema } from '~/schema/tagGroup'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification
    
    try {

        const body = await readBody(event)

        // Validation des données d'entrée
        const input = CreateTagGroupSchema.safeParse(body)
        if (!input.success) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid tag group data',
                tag: 'api.tags.create.validation_error'
            })
        }

        // Création du groupe de tags
        const group = await prisma.tagGroup.create({
            data: {
                name: input.data.name,
            }
        })

        return {
            ...group,
            message: 'Tag group created successfully',
        }

    } catch (error) {

        const err = error as { statusCode?: number; tag?: string }
        if (err.statusCode && err.tag) {
            throw err
        }

        // Gestion des erreurs de contrainte d'unicité
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
            throw createAppError({
                statusCode: 400,
                message: 'A tag group with this name already exists',
                tag: 'api.tags.create.group_exists',
                error
            })
        }

        // Erreur serveur générique
        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while creating the tag group',
            tag: 'api.tags.create.server_error',
            error
        })
    }
})
