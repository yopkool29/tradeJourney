import { createAppError } from '../../utils/errors'
import { getApiContext } from '../../utils/apiHelpers'
import { getCustomFieldValue } from '../../utils/symbolResolver'
import { CreateSymbolSchema } from '~/schema/symbol'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

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

        const customFields = body.customFields ?? null
        const aliases = getCustomFieldValue(customFields, 'aliases') ?? parsed.data.aliases ?? ''
        const metadata = customFields ? { customFields } : null

        // Créer le nouveau symbole
        const newSymbol = await prisma.configSymbol.create({
            data: {
                digit: parsed.data.digit,
                symbol: parsed.data.symbol,
                notes: parsed.data.notes || null,
                aliases,
                pricePerPoint: parsed.data.pricePerPoint ?? -1,
                ...(metadata && { metadata }),
            }
        })

        return {
            ...newSymbol,
            message: 'Symbol created successfully',
        }

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error while creating symbol',
            tag: 'api.config_symbols.create.error',
            error: error,
        })
    }
})
