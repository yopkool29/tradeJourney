import { createAppError } from '../../utils/errors'
import { getApiContext } from '../../utils/apiHelpers'
import { getCustomFieldValue } from '../../utils/symbolResolver'
import type { Prisma } from '~/generated/prisma-data'
import { CreateAccountSchema } from '~/schema/account'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        const body = await readBody(event)
        const parsed = CreateAccountSchema.parse({ ...body })

        // Vérifier si le compte existe déjà pour cet utilisateur
        const existingAccount = await prisma.account.findFirst({
            where: {
                name: parsed.name
            }
        })

        if (existingAccount) {
            throw createAppError({
                statusCode: 400,
                message: 'An account with this name already exists in your configuration',
                tag: 'api.account.create.account_exists'
            })
        }

        // Merger startingCapital et customFields dans metadata
        const customFields = body.customFields ?? null
        const aliases = getCustomFieldValue(customFields, 'aliases') ?? parsed.aliases ?? ''

        let metadata: Record<string, unknown> | undefined
        if (body.startingCapital !== undefined && body.startingCapital !== null) {
            metadata = { startingCapital: body.startingCapital }
        }
        if (customFields) {
            metadata = { ...(metadata ?? {}), customFields }
        }

        // Créer le nouveau compte
        const newAccount = await prisma.account.create({
            data: {
                name: parsed.name,
                displayName: parsed.displayName,
                fullname: parsed.fullname,
                aliases,
                ...(metadata && { metadata: metadata as Prisma.InputJsonValue }),
            }
        })

        return {
            ...newAccount,
            message: 'Account created successfully',
        }

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while creating the account',
            tag: 'api.account.create.server_error',
            error
        })
    }
})
