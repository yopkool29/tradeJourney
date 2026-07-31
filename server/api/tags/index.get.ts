import { createAppError } from '../../utils/errors'
import { getApiContext } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        // Récupération de tous les groupes de tags (et leurs tags)
        const groups = await prisma.tagGroup.findMany({
            include: {
                tags: {
                    orderBy: { name: 'asc' }
                }
            }
        })

        // Tri par metadata.order (ASC) puis par name (ASC)
        groups.sort((a, b) => {
            const orderA = (a.metadata as Record<string, unknown>)?.order as number ?? Number.MAX_SAFE_INTEGER
            const orderB = (b.metadata as Record<string, unknown>)?.order as number ?? Number.MAX_SAFE_INTEGER
            if (orderA !== orderB) return orderA - orderB
            return a.name.localeCompare(b.name)
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
