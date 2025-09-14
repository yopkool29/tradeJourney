import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'
import { CreateSymbolSchema } from '~/schema/symbol'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId

    try {

        const body = await readBody(event)

        const parsed = CreateSymbolSchema.safeParse({ ...body })

        if (!parsed.success) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid symbol data',
                tag: 'api.config_symbols.create.validation_error',
            })
        }

        // Vérifier si le symbole existe déjà pour cet utilisateur
        const existingSymbol = await prisma.configSymbol.findFirst({
            where: {
                symbol: parsed.data.symbol
            }
        })

        if (existingSymbol) {
            throw createAppError({
                statusCode: 400,
                message: 'This symbol already exists in your configuration',
                tag: 'api.config_symbols.create.symbol_exists'
            })
        }

        // Créer le nouveau symbole
        const newSymbol = await prisma.configSymbol.create({
            data: {
                digit: parsed.data.digit,
                symbol: parsed.data.symbol,
                notes: parsed.data.notes || null
            }
        })

        return {
            ...newSymbol,
            message: 'Symbol created successfully',
        }

    } catch (error) {
        // Si c'est déjà une AppError, on la propage
        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error

        throw createAppError({
            statusCode: 500,
            message: 'Error while creating symbol',
            tag: 'api.config_symbols.create.error',
            error: error,
        })
    }
})
