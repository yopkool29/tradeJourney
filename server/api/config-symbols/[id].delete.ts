import { createAppError } from '../../utils/errors'
import { getApiContext, getValidatedId } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {

        const { prisma } = await getApiContext(event)

        const id = getValidatedId(event, 'id', 'api.config_symbols.delete.invalid_id')

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
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error while deleting symbol',
            tag: 'api.config_symbols.delete.error',
            error: error
        })
    }
})
