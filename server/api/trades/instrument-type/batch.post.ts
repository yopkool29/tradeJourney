import { createAppError } from '../../../utils/errors'
import { getApiContext, parseBody } from '../../../utils/apiHelpers'
import { InstrumentType } from '~/type'
import { z } from 'zod'

const BatchUpdateSchema = z.object({
	accountId: z.number().int().positive(),
	instrumentType: z.nativeEnum(InstrumentType),
})

export default defineEventHandler(async (event) => {
	try {
		const { prisma } = await getApiContext(event)

		const parsed = await parseBody(event, BatchUpdateSchema)

		const result = await prisma.trade.updateMany({
			where: {
				accountId: parsed.accountId,
				active: true,
			},
			data: {
				instrumentType: parsed.instrumentType,
			},
		})

		return { count: result.count }

	} catch (error: unknown) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({
			statusCode: 500,
			message: 'Error while batch updating instrument type',
			tag: 'api.trades.batch_instrument_type.error',
			error: error instanceof Error ? error.message : 'Unknown error'
		})
	}
})
