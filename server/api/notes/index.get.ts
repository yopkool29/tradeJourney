import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {
        const query = getQuery(event)
        const date = query.date

        // If a specific date is provided, get that note
        if (date) {
            const targetDate = new Date(date as string)

            const startOfDay = new Date(targetDate)
            startOfDay.setHours(0, 0, 0, 0)

            const endOfDay = new Date(targetDate)
            endOfDay.setHours(23, 59, 59, 999)

            const note = await prisma.dailyNote.findFirst({
                where: {
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            })
            return note
        }

        // Otherwise, get all notes with their dates
        const notes = await prisma.dailyNote.findMany({
            select: {
                id: true,
                date: true,
                content: true,
                updatedAt: true
            },
            orderBy: { date: 'desc' }
        })

        return notes

    } catch (error) {
        throw createAppError({
            statusCode: 500,
            message: 'Error fetching notes',
            tag: 'api.notes.get.error',
            error
        })
    }
})
