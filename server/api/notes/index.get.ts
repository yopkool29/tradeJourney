import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    
    try {
        const prisma = await getPrisma(event)

        const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification
        
        const query = getQuery(event)
        
        const date = query.date

        // If a specific date is provided, get all notes for that day
        if (date) {
            const targetDate = new Date(date as string)

            const startOfDay = new Date(targetDate)
            startOfDay.setHours(0, 0, 0, 0)

            const endOfDay = new Date(targetDate)
            endOfDay.setHours(23, 59, 59, 999)

            const notes = await prisma.dailyNote.findMany({
                where: {
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                orderBy: { date: 'desc' }
            })
            return notes
        }

        // Otherwise, get all notes with their dates
        const notes = await prisma.dailyNote.findMany({
            select: {
                id: true,
                date: true,
                content: true,
                metadata: true,
                updatedAt: true
            },
            orderBy: { date: 'desc' }
        })

        return notes

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error fetching notes',
            tag: 'api.notes.get.error',
            error
        })
    }
})
