import { getApiContext } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

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
            // Créer les dates de début et de fin du mois en UTC (les day tags sont stockés à minuit UTC)
                const startDate = new Date(Date.UTC(year, monthNum - 1, 1))
                const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999))

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
        
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error while retrieving day tags',
            tag: 'api.day_tags.list.error',
            error
        })
    }
})
