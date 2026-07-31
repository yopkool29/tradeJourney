import { createAppError } from '../../utils/errors'
import { getApiContext } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

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
