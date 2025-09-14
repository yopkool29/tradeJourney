import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'


export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification

    try {
        const body = await readBody(event)


        // Create or update the note
        const note = await prisma.dailyNote.upsert({
            where: {
                date: new Date(body.date)
            },
            update: {
                content: body.content
            },
            create: {
                date: new Date(body.date),
                content: body.content,
            }
        })

        return {
            success: true,
            note,
            message: 'Note saved successfully'
        }
    } catch (error) {
        throw createAppError({
            statusCode: 500,
            message: 'Error saving note',
            tag: 'api.notes.post.error',
            error
        })
    }
})