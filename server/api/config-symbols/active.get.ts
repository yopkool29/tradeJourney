import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId

    try {

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
