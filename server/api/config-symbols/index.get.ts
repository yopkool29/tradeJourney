import { getPrisma } from '../../utils/db'
import { Prisma } from '~/generated/prisma-data'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        
        const _userId = event.context.userId

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
