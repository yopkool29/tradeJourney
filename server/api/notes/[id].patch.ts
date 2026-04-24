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

		// Merger subtitle dans metadata côté serveur
		if (body.subtitle !== undefined) {
			const existing = await prisma.dailyNote.findUnique({ where: { id }, select: { metadata: true } })
			const currentMetadata = (existing?.metadata as Record<string, unknown>) ?? {}
			if (body.subtitle) {
				updateData.metadata = { ...currentMetadata, subtitle: body.subtitle }
			} else {
				const { subtitle: _, ...rest } = currentMetadata
				updateData.metadata = Object.keys(rest).length > 0 ? rest : null
			}
		}

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
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) {
			throw error
		}

		throw createAppError({
			statusCode: 500,
			message: 'Error updating note',
			tag: 'api.notes.patch.error',
			error,
		})
	}
})
