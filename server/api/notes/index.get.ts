import { createAppError } from '../../utils/errors'
import { getApiContext } from '../../utils/apiHelpers'

type NoteDateFilter = {
	gte?: Date
	lte?: Date
}

const parseDateQuery = (value: unknown): Date | undefined => {
	if (value === undefined) return undefined
	if (typeof value !== 'string') throw createAppError({ statusCode: 400, message: 'Invalid note date', tag: 'api.notes.get.invalid_date' })
	const date = new Date(value)
	if (isNaN(date.getTime())) throw createAppError({ statusCode: 400, message: 'Invalid note date', tag: 'api.notes.get.invalid_date' })
	return date
}

const parseIntegerQuery = (value: unknown, defaultValue: number, maximum: number): number => {
	if (value === undefined) return defaultValue
	if (typeof value !== 'string' || !/^\d+$/.test(value)) throw createAppError({ statusCode: 400, message: 'Invalid pagination', tag: 'api.notes.get.invalid_pagination' })
	const parsed = Number(value)
	if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maximum) throw createAppError({ statusCode: 400, message: 'Invalid pagination', tag: 'api.notes.get.invalid_pagination' })
	return parsed
}

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
        const dateFrom = parseDateQuery(query.date_from)
        const dateTo = parseDateQuery(query.date_to)
        if (dateFrom && dateTo && dateFrom > dateTo) {
            throw createAppError({ statusCode: 400, message: 'Invalid note date range', tag: 'api.notes.get.invalid_date_range' })
        }
        const dateFilter: NoteDateFilter = {}
        if (dateFrom) dateFilter.gte = dateFrom
        if (dateTo) dateFilter.lte = dateTo
        const limit = parseIntegerQuery(query.limit, -1, 100)
        const offset = parseIntegerQuery(query.offset, 0, 1000000)
        const notes = await prisma.dailyNote.findMany({
            where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : undefined,
            select: {
                id: true,
                date: true,
                content: true,
                metadata: true,
                updatedAt: true
            },
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            take: limit >= 0 ? limit : undefined,
            skip: offset
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
