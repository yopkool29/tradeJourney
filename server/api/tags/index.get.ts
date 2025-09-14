import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {
        // Récupération de tous les groupes de tags (et leurs tags)
        const groups = await prisma.tagGroup.findMany({
            include: { tags: true },
            orderBy: { name: 'asc' }
        })

        return groups

    } catch (error) {
        // Si c'est déjà une AppError, on la propage
        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error

        throw createAppError({
            statusCode: 500,
            message: 'Error while retrieving tag groups',
            tag: 'api.tags.list.error',
            error
        })
    }
})
