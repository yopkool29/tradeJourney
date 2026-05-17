import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'
import { CreateAccountSchema } from '~/schema/account'

export default defineEventHandler(async (event) => {
    await auth(event)
    
    try {
        const prisma = await getPrisma(event)
        const _userId = event.context.userId

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
        const aliasFromFields = customFields?.find((f: { key: string }) => f.key === 'aliases')?.value ?? null
        const aliases = aliasFromFields ?? parsed.aliases ?? ''

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
                ...(metadata && { metadata: metadata as any }),
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
