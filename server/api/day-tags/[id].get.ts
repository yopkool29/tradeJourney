import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {
        const id = Number(event.context.params?.id)

        if (!id || isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid day tag ID',
                tag: 'api.day_tags.get.invalid_id'
            })
        }

        // Récupération du day tag spécifique avec ses tags associés
        const dayTag = await prisma.dayTag.findUnique({
            where: { 
                id
            },
            include: { 
                DayTagAssociation: {
                    include: {
                        tag: true
                    }
                }
            }
        })

        if (!dayTag) {
            throw createAppError({
                statusCode: 404,
                message: 'Day tag not found',
                tag: 'api.day_tags.get.not_found'
            })
        }

        // Transformer le résultat pour un format plus pratique
        const formattedDayTag = {
            ...dayTag,
            tags: dayTag.DayTagAssociation.map(t => t.tag)
        }

        return formattedDayTag

    } catch (error) {
        // Si c'est déjà une AppError, on la propage
        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error
        
        throw createAppError({
            statusCode: 500,
            message: 'Error while retrieving day tag',
            tag: 'api.day_tags.get.error',
            error: error
        })
    }
})
