import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        const id = Number(event.context.params?.id)

        if (isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid note ID',
                tag: 'api.notes.delete.invalid_id'
            })
        }

        const note = await prisma.dailyNote.findUnique({ where: { id } })
        if (!note) {
            throw createAppError({
                statusCode: 404,
                message: 'Note not found',
                tag: 'api.notes.delete.not_found'
            })
        }

        await prisma.dailyNote.delete({ where: { id } })
        return {
            success: true,
            message: 'Note deleted successfully'
        }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error deleting note',
            tag: 'api.notes.delete.error',
            error
        })
    }
})
