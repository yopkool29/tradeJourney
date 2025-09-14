import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId

    try {

        const id = Number(event.context.params?.id)

        if (!id || isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid symbol ID',
                tag: 'api.config_symbols.delete.invalid_id'
            })
        }

        // Vérifier si le symbole existe et appartient à l'utilisateur
        const symbol = await prisma.configSymbol.findFirst({
            where: {
                id
            }
        })

        if (!symbol) {
            throw createAppError({
                statusCode: 404,
                message: 'Symbol not found',
                tag: 'api.config_symbols.delete.not_found'
            })
        }

        // Supprimer le symbole
        await prisma.configSymbol.delete({
            where: { id }
        })

        return {
            success: true,
            message: 'Symbol deleted successfully',
        }

    } catch (error) {
        // Si c'est déjà une AppError, on la propage
        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error

        throw createAppError({
            statusCode: 500,
            message: 'Error while deleting symbol',
            tag: 'api.config_symbols.delete.error',
            error: error
        })
    }
})
