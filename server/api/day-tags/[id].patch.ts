import { PrismaClientKnownRequestError } from '~/generated/prisma/internal/prismaNamespace'
import { prisma } from '../../utils/prisma'
import { UpdateDayTagSchema } from '~/schema/dayTag'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {
        const id = Number(event.context.params?.id)

        if (!id || isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid day tag ID',
                tag: 'api.day_tags.update.invalid_id'
            })
        }

        const body = await readBody(event)

        // Valider les données d'entrée
        const input = UpdateDayTagSchema.parse({ ...body, id })

        // Vérifier que le DayTag existe
        const existingDayTag = await prisma.dayTag.findUnique({
            where: { id }
        })

        if (!existingDayTag) {
            throw createAppError({
                statusCode: 404,
                message: 'Day tag not found',
                tag: 'api.day_tags.update.not_found'
            })
        }

        // Extraire les IDs de tags s'ils sont fournis
        const tagIds = body.tagIds || []

        // Mettre à jour le DayTag
        const dayTag = await prisma.$transaction(async (prisma) => {
            // 1. Mettre à jour les informations de base du DayTag
            await prisma.dayTag.update({
                where: { id },
                data: {
                    date: input.date,
                    note: input.note
                }
            })

            // Supprimer toutes les relations existantes
            await prisma.dayTagAssociation.deleteMany({
                where: { dayTagId: id }
            })

            if (tagIds.length > 0) {
                // Créer les nouvelles relations
                await Promise.all(tagIds.map((tagId: number) =>
                    prisma.dayTagAssociation.create({
                        data: {
                            dayTagId: id,
                            tagId
                        }
                    })
                ))
            }

            // 3. Récupérer le DayTag mis à jour avec ses tags
            return prisma.dayTag.findUnique({
                where: { id },
                include: {
                    DayTagAssociation: {
                        include: {
                            tag: true
                        }
                    }
                }
            })
        })

        if (!dayTag) {
            throw createAppError({
                statusCode: 500,
                message: 'Error while updating day tag',
                tag: 'api.day_tags.update.error'
            })
        }

        // Transformer le résultat pour un format plus pratique
        const formattedDayTag = {
            ...dayTag,
            tags: dayTag.DayTagAssociation.map(t => t.tag)
        }

        return {
            ...formattedDayTag,
            message: 'Day tag updated successfully',
        }

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw createAppError({
                    statusCode: 400,
                    message: 'A day tag already exists for this date',
                    tag: 'api.day_tags.update.existing_day_tag'
                })
            } else if (error.code === 'P2003') {
                throw createAppError({
                    statusCode: 400,
                    message: 'One or more specified tags do not exist',
                    tag: 'api.day_tags.update.invalid_tag'
                })
            }
        }

        // Si c'est déjà une AppError, on la propage
        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error
        
        throw createAppError({
            statusCode: 500,
            message: 'Error while updating day tag',
            tag: 'api.day_tags.update.error',
            error
        })
    }
})
