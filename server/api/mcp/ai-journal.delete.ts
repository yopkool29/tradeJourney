import { createAppError } from '../../utils/errors'
import { getApiContext } from '../../utils/apiHelpers'

const mcpJournalDate = new Date('1980-01-01T00:00:00.000Z')

export default defineEventHandler(async (event) => {
	try {
		const { prisma } = await getApiContext(event)

		const notes = await prisma.dailyNote.findMany({
			where: { date: mcpJournalDate },
			orderBy: { id: 'asc' },
		})

		let deletedCount = 0
		for (const note of notes) {
			await prisma.dailyNote.delete({ where: { id: note.id } })
			deletedCount++
		}

		return {
			success: true,
			deleted: deletedCount,
			message: 'MCP AI journal cleared',
		}
	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) throw error

		throw createAppError({
			statusCode: 500,
			message: 'Error clearing MCP AI journal',
			tag: 'api.mcp.ai_journal.clear_error',
			error,
		})
	}
})
