import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'
import { UpdateAccountSchema } from '~/schema/account'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const body = await readBody(event)

        // Validation des données
        let parsed
        try {
            parsed = UpdateAccountSchema.parse(body)
        } catch (error) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid account data',
                tag: 'api.account.update.validation_error',
                error
            })
        }

        const id = parsed.id
        const { id: _, ...updateData } = parsed

        // Mise à jour du compte
        const updatedAccount = await prisma.account.update({
            where: { id },
            data: updateData
        })

        return {
            ...updatedAccount,
            message: 'Account updated successfully'
        }

    } catch (error) {
        const err = error as { statusCode?: number; tag?: string }
        if (err.statusCode && err.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error updating account',
            tag: 'api.account.update.server_error',
            error: error as Error
        })
    }
})
