import { getAuthDb } from '../../utils/db'  
import { Prisma } from '~/generated/prisma-auth'
import auth from '../../utils/auth'
import { SettingsSchema } from '~/schema/user'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    const prisma = getAuthDb()

    const userId = parseInt(event.context.userId)
    
    try {

        const body = await readBody(event)

        // Validation des données
        let data
        try {
            data = SettingsSchema.parse(body)
        } catch (error) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid settings data',
                tag: 'api.auth.settings.validation_error',
                error
            })
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { settings: data.settings }
        })

        return { settings: user.settings }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while updating user settings',
            tag: 'api.auth.settings.update_error',
            error
        })
    }
})
