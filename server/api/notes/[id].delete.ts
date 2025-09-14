import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {
        const id = Number(event.context.params?.id)

        if (isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid note ID',
                tag: 'api.notes.delete.invalid_id'
            })
        }

        // Check if the note belongs to the user
        const note = await prisma.dailyNote.findUnique({
            where: { id }
        })

        if (!note) {
            throw createAppError({
                statusCode: 404,
                message: 'Note not found',
                tag: 'api.notes.delete.not_found'
            })
        }

        // Delete the note
        await prisma.dailyNote.delete({
            where: { id }
        })

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
