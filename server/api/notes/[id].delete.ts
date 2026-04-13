import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

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

    try {
        await prisma.dailyNote.delete({ where: { id } })
        return {
            success: true,
            message: 'Note deleted successfully'
        }
    } catch (err) {
        throw createAppError({
            statusCode: 500,
            message: 'Error deleting note',
            tag: 'api.notes.delete.error',
            error: err
        })
    }
})
