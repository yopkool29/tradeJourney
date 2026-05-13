import { getPrisma } from '../../utils/db'
import { Prisma } from '~/generated/prisma-data'
import { CreateDayTagSchema } from '~/schema/dayTag'
import { toUTCMidnight } from '~/utils/date-utils'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)

        const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

        const body = await readBody(event)

        // Valider les données d'entrée
        const input = CreateDayTagSchema.parse(body)

        // Extraire les IDs de tags s'ils sont fournis
        const tagIds = body.tagIds || []

        // Convertir la date YYYY-MM-DD en ISO 8601 DateTime (ajouter l'heure minuit)
        const dateTime = toUTCMidnight(input.date)

        // Upsert: créer ou mettre à jour le DayTag
        const dayTag = await prisma.$transaction(async (tx) => {
            // Vérifier si un DayTag existe déjà pour cette date
            const existing = await tx.dayTag.findFirst({
                where: { date: dateTime }
            })

            if (existing) {
                // Mettre à jour l'existant
                await tx.dayTag.update({
                    where: { id: existing.id },
                    data: { note: input.note }
                })

                // Remplacer les tags
                await tx.dayTagAssociation.deleteMany({
                    where: { dayTagId: existing.id }
                })

                if (tagIds.length > 0) {
                    await tx.dayTagAssociation.createMany({
                        data: tagIds.map((tagId: number) => ({
                            dayTagId: existing.id,
                            tagId
                        }))
                    })
                }

                return tx.dayTag.findUnique({
                    where: { id: existing.id },
                    include: {
                        DayTagAssociation: {
                            include: { tag: true }
                        }
                    }
                })
            } else {
                // Créer un nouveau DayTag
                return tx.dayTag.create({
                    data: {
                        date: dateTime,
                        note: input.note,
                        DayTagAssociation: {
                            create: tagIds.map((tagId: number) => ({
                                tag: { connect: { id: tagId } }
                            }))
                        }
                    },
                    include: {
                        DayTagAssociation: {
                            include: { tag: true }
                        }
                    }
                })
            }
        })

        if (!dayTag) {
            throw createAppError({
                statusCode: 500,
                tag: 'api.day_tags.create.error',
                message: 'Error while creating/updating day tag'
            })
        }

        // Transformer le résultat pour un format plus pratique
        const { DayTagAssociation, ...dayTagWithoutAssoc } = dayTag
        const formattedDayTag = {
            ...dayTagWithoutAssoc,
            tags: DayTagAssociation.map(t => t.tag)
        }

        // Retourner avec un message de succès internationalisé
        return {
            ...formattedDayTag,
            message: 'Day tag created successfully'
        }

    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw createAppError({
                    statusCode: 400,
                    tag: 'api.day_tags.create.existing_day_tag',
                    message: 'A day tag already exists for this date',
                    error
                })
            } else if (error.code === 'P2003') {
                throw createAppError({
                    statusCode: 400,
                    tag: 'api.day_tags.create.invalid_tag',
                    message: 'One or more specified tags do not exist',
                    error
                })
            }
        }

        throw createAppError({
            statusCode: 500,
            tag: 'api.day_tags.create.error',
            message: 'Error while creating day tag',
            error
        })
    }
})
