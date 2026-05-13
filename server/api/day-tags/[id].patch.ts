import { getPrisma } from '../../utils/db'
import { Prisma } from '~/generated/prisma-data'
import { UpdateDayTagSchema } from '~/schema/dayTag'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
    
        const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

        const id = Number(event.context.params?.id)

        if (!id || isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid day tag ID',
                tag: 'api.day_tags.update.invalid_id'
            })
        }

        const body = await readBody(event)

        // Le schéma Zod va automatiquement filtrer les champs non définis
        const input = UpdateDayTagSchema.parse({ 
            id,
            note: body.note,
            date: body.date,
            tagIds: body.tagIds
        })
        
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
        const tagIds = body.tagIds
       

        // Mettre à jour le DayTag
        const dayTag = await prisma.$transaction(async (prisma) => {
            // 1. Mettre à jour les informations de base du DayTag
            // Note: La date n'est pas modifiable car c'est l'identifiant unique
            const updateData: { note?: string | null } = {}
            if (input.note !== undefined) updateData.note = input.note
            
            if (Object.keys(updateData).length > 0) {
                await prisma.dayTag.update({
                    where: { id },
                    data: updateData
                })
            }

            // 2. Mettre à jour les tags SEULEMENT si tagIds est fourni
            if (tagIds !== undefined) {
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
        const { DayTagAssociation, ...dayTagWithoutAssoc } = dayTag
        const formattedDayTag = {
            ...dayTagWithoutAssoc,
            tags: DayTagAssociation.map(t => t.tag)
        }

        return {
            ...formattedDayTag,
            message: 'Day tag updated successfully',
        }

    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
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

        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }
                
        throw createAppError({
            statusCode: 500,
            message: 'Error while updating day tag',
            tag: 'api.day_tags.update.error',
            error
        })
    }
})
