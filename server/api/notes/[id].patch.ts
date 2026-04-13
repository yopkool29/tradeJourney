import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
	await auth(event)

	try {
		const prisma = await getPrisma(event)
		const id = Number(getRouterParam(event, 'id'))

		if (!id || isNaN(id)) {
			throw createAppError({
				statusCode: 400,
				message: 'Invalid note ID',
				tag: 'api.notes.patch.invalid_id',
			})
		}

		const body = await readBody(event)

		const updateData: Record<string, unknown> = {}
		if (body.date !== undefined) updateData.date = new Date(body.date)
		if (body.content !== undefined) updateData.content = body.content
		if (body.metadata !== undefined) updateData.metadata = body.metadata

		const note = await prisma.dailyNote.update({
			where: { id },
			data: updateData,
		})

		return {
			success: true,
			note,
			message: 'Note updated successfully',
		}
	} catch (error) {
		throw createAppError({
			statusCode: 500,
			message: 'Error updating note',
			tag: 'api.notes.patch.error',
			error,
		})
	}
})
