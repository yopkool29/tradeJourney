import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {
        // Préparer la condition where
        const whereCondition: Record<string, unknown> = {}

        // Récupérer le paramètre month de la requête (format 'YYYY-MM')
        const query = getQuery(event)
        const month = query.month as string | undefined

        // Si un mois est spécifié, ajouter une condition sur la date
        if (month) {
            const [year, monthNum] = month.split('-').map(Number)
            
            // Vérifier que le format est valide
            if (!isNaN(year) && !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
            // Créer les dates de début et de fin du mois
                const startDate = new Date(year, monthNum - 1, 1) // Mois commence à 0 en JS
                const endDate = new Date(year, monthNum, 0) // Dernier jour du mois

            // Ajouter la condition de date
            whereCondition.date = {
                gte: startDate,
                lte: endDate
                }
            }
        }

        // Récupération des day tags avec leurs tags associés
        const dayTags = await prisma.dayTag.findMany({
            where: whereCondition,
            include: {
                // Utiliser DayTagAssociation pour accéder aux tags associés
                DayTagAssociation: {
                    include: {
                        tag: true
                    }
                }
            },
            orderBy: { date: 'desc' }
        })

        const formattedDayTags = dayTags.map(dayTag => {
            // Extraire les tags de DayTagAssociation et exclure createdAt/updatedAt
            const tags = dayTag.DayTagAssociation.map(t => {
                const { createdAt, updatedAt, groupId, ...tagWithoutTimestamps } = t.tag;
                return tagWithoutTimestamps;
            });

            // Créer un nouvel objet sans la propriété DayTagAssociation
            const { DayTagAssociation, ...rest } = dayTag;

            return {
                ...rest,
                tags
            };
        })

        return formattedDayTags

    } catch (error) {
        // Si c'est déjà une AppError, on la propage
        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error

        throw createAppError({
            statusCode: 500,
            message: 'Error while retrieving day tags',
            tag: 'api.day_tags.list.error',
            error
        })
    }
})
