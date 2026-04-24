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

        // Merger subtitle dans metadata côté serveur
        let metadata = body.metadata ?? undefined
        if (body.subtitle !== undefined) {
            const existing = await prisma.dailyNote.findUnique({ where: { date: noteDate }, select: { metadata: true } })
            const currentMetadata = (existing?.metadata as Record<string, unknown>) ?? {}
            if (body.subtitle) {
                metadata = { ...currentMetadata, subtitle: body.subtitle }
            } else {
                const { subtitle: _, ...rest } = currentMetadata
                metadata = Object.keys(rest).length > 0 ? rest : null
            }
        }

        // Create or update the note
        const note = await prisma.dailyNote.upsert({
            where: {
                date: noteDate
            },
            update: {
                content: body.content,
                metadata,
            },
            create: {
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