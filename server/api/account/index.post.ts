import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'
import { CreateAccountSchema } from '~/schema/account'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId
    
    try {

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

        // Créer le nouveau compte
        const newAccount = await prisma.account.create({
            data: {
                name: parsed.name,
                displayName: parsed.displayName,
                fullname: parsed.fullname
            }
        })

        return {
            ...newAccount,
            message: 'Account created successfully',
        }

    } catch (error) {
        const err = error as { statusCode?: number; tag?: string }
        if (err.statusCode && err.tag) {
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
