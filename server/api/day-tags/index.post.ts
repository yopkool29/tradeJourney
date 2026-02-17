import { getPrisma } from '../../utils/db'
import { Prisma } from '~/generated/prisma-data'
import { CreateDayTagSchema } from '~/schema/dayTag'

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
        const dateTime = input.date instanceof Date 
            ? input.date 
            : new Date(`${input.date}T00:00:00.000Z`)

        // Créer le DayTag
        const dayTag = await prisma.dayTag.create({
            data: {
                date: dateTime,
                note: input.note,
                // Créer les relations avec les tags via DayTagAssociation
                DayTagAssociation: {
                    create: tagIds.map((tagId: number) => ({
                        tag: { connect: { id: tagId } }
                    }))
                }
            },
            include: {
                DayTagAssociation: {
                    include: {
                        tag: true
                    }
                }
            }
        })

        // Transformer le résultat pour un format plus pratique
        const formattedDayTag = {
            ...dayTag,
            tags: dayTag.DayTagAssociation.map(t => t.tag)
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
