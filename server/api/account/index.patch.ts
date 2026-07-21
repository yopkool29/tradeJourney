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
        const { id: _, customFields: _customFields, ...updateData } = parsed

        // Merger startingCapital et customFields dans metadata côté serveur
        const needsMetadataUpdate = body.startingCapital !== undefined || body.customFields !== undefined
        if (needsMetadataUpdate) {
            const existing = await prisma.account.findUnique({ where: { id }, select: { metadata: true } })
            let currentMetadata = (existing?.metadata as Record<string, unknown>) ?? {}

            if (body.startingCapital !== undefined) {
                if (body.startingCapital !== null) {
                    currentMetadata = { ...currentMetadata, startingCapital: body.startingCapital }
                } else {
                    const { startingCapital: _, ...rest } = currentMetadata
                    currentMetadata = rest
                }
            }

            if (body.customFields) {
                const aliasFromFields = body.customFields.find((f: { key: string }) => f.key === 'aliases')?.value ?? null
                if (aliasFromFields !== null) {
                    ;(updateData as any).aliases = aliasFromFields
                }
                currentMetadata = { ...currentMetadata, customFields: body.customFields }
            }

            ;(updateData as any).metadata = Object.keys(currentMetadata).length > 0 ? currentMetadata : null
        }

        // Mise à jour du compte
        const updatedAccount = await prisma.account.update({
            where: { id },
            data: updateData as any
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
