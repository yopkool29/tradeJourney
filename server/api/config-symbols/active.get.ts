import { createAppError } from '../../utils/errors'
import { getApiContext } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        // Récupérer tous les symboles actifs de l'utilisateur
        const symbols = await prisma.configSymbol.findMany({
            where: {
                active: true
            },
            orderBy: {
                symbol: 'asc'
            }
        });

        return symbols;
    } catch (error) {
        throw createAppError({
            statusCode: 500,
            message: 'Error while fetching active symbols',
            tag: 'api.config_symbols.active.get_error',
            error: error
        })
    }
})
