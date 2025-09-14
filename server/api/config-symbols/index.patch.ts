import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'
import { UpdateSymbolSchema } from '~/schema/symbol'
import { PrismaClientKnownRequestError } from '~/generated/prisma/internal/prismaNamespace'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const body = await readBody(event)

        const parsed = UpdateSymbolSchema.safeParse(body)

        if (!parsed.success) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid symbol data',
                tag: 'api.config_symbols.update.validation_error'
            })
        }

        const id = parsed.data.id

        // Mettre à jour le symbole avec seulement les champs fournis
        const { id: _, ...updateData } = parsed.data // On exclut l'id des données de mise à jour

        try {
            const symbol = await prisma.configSymbol.update({
                where: { id },
                data: updateData
            });

            return symbol;

        } catch (error) {

            if (error instanceof PrismaClientKnownRequestError && error?.code === 'P2025') { // Record not found
                throw createAppError({
                    statusCode: 404,
                    message: 'Symbol not found',
                    tag: 'api.config_symbols.update.not_found'
                })
            }
            throw error;
        }

    } catch (error) {
        // Si c'est déjà une AppError, on la propage
        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error

        throw createAppError({
            statusCode: 500,
            message: 'Error while updating symbol',
            tag: 'api.config_symbols.update.error',
            error: error,
        })
    }
})
