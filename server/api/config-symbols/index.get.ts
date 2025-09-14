import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId

    try {

        const symbols = await prisma.configSymbol.findMany({
            orderBy: { symbol: 'asc' }
        })

        return symbols

    } catch (error) {

        throw createAppError({
            statusCode: 500,
            message: 'Error while fetching symbols',
            tag: 'api.config_symbols.list.get_error',
            error: error
        })

    }
})
