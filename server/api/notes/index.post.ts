import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'


export default defineEventHandler(async (event) => {
    await auth(event)
    
    try {
        const prisma = await getPrisma(event)

        const _userId = event.context.userId // Non utilisé car géré par le middleware d'authentification
        
        const body = await readBody(event)

        const noteDate = new Date(body.date)

        // Create or update the note
        const note = await prisma.dailyNote.upsert({
            where: {
                date: noteDate
            },
            update: {
                content: body.content
            },
            create: {
                date: noteDate,
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