import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'
import { UpdateAccountSchema } from '~/schema/account'

export default defineEventHandler(async (event) => {
    await auth(event)
    const prisma = await getPrisma(event)
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

        // Merger startingCapital dans metadata côté serveur
        if (body.startingCapital !== undefined) {
            const existing = await prisma.account.findUnique({ where: { id }, select: { metadata: true } })
            const currentMetadata = (existing?.metadata as Record<string, unknown>) ?? {}
            if (body.startingCapital !== null) {
                updateData.metadata = { ...currentMetadata, startingCapital: body.startingCapital }
            } else {
                const { startingCapital: _, ...rest } = currentMetadata
                updateData.metadata = Object.keys(rest).length > 0 ? rest : null
            }
        }

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
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
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
