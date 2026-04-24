import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        
        const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification
        
        // Récupération de tous les groupes de tags (et leurs tags)
        const groups = await prisma.tagGroup.findMany({
            include: {
                tags: {
                    orderBy: { name: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        })

        return groups

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw err
        }
        
        throw createAppError({
            statusCode: 500,
            message: 'Error while retrieving tag groups',
            tag: 'api.tags.list.error',
            error
        })
    }
})
