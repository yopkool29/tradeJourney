import { createAppError } from '../../utils/errors'
import { getApiContext } from '../../utils/apiHelpers'


export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        const body = await readBody(event)

        const noteDate = new Date(body.date)

        // Merger subtitle dans metadata
        let metadata = body.metadata ?? null
        if (body.subtitle !== undefined && body.subtitle) {
            metadata = { ...(body.metadata ?? {}), subtitle: body.subtitle }
        }

        // Create a new note (always create, never update via date)
        const note = await prisma.dailyNote.create({
            data: {
                date: noteDate,
                content: body.content,
                metadata,
            }
        })

        return {
            success: true,
            note,
            message: 'Note saved successfully'
        }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error saving note',
            tag: 'api.notes.post.error',
            error
        })
    }
})