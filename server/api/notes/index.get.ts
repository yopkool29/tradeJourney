import { createAppError } from '../../utils/errors'
import { getApiContext } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

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
