import { z } from 'zod'
import { createAppError } from '../../utils/errors'
import { getApiContext, parseBody } from '../../utils/apiHelpers'

const mcpJournalDate = new Date('1980-01-01T00:00:00.000Z')
const mcpJournalLockId = 198001010000
const maxJournalLength = 1_000_000

const AppendMcpJournalSchema = z.object({
	title: z.string().trim().min(1).max(200).optional(),
	content: z.string().trim().min(1).max(50_000),
}).strict()

export default defineEventHandler(async (event) => {
	try {
		const { prisma } = await getApiContext(event)
		const body = await parseBody(event, AppendMcpJournalSchema)
		const timestamp = new Date().toISOString()
		const entry = `_Enregistré le ${timestamp}_\n\n${body.content}`

		const note = await prisma.$transaction(async (transaction) => {
			await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${mcpJournalLockId})::text AS lock`
			const candidates = await transaction.dailyNote.findMany({
				where: { date: mcpJournalDate },
				orderBy: { id: 'asc' },
			})
			const existing = candidates[0]
			const content = existing?.content.trim()
				? `${existing.content.trim()}\n\n---\n\n${entry}`
				: `# Journal des analyses IA\n\n${entry}`

			if (content.length > maxJournalLength) {
				throw createAppError({
					statusCode: 413,
					message: 'MCP AI journal is too large',
					tag: 'api.mcp.ai_journal.too_large',
				})
			}

			if (existing) {
				return transaction.dailyNote.update({
					where: { id: existing.id },
					data: { content, metadata: { subtitle: 'Analyse IA' } },
				})
			}

			return transaction.dailyNote.create({
				data: {
					date: mcpJournalDate,
					content,
					metadata: { subtitle: 'Analyse IA' },
				},
			})
		})

		return {
			success: true,
			note: {
				id: note.id,
				date: note.date,
				updatedAt: note.updatedAt,
			},
			message: 'AI analysis appended to MCP journal',
		}
	} catch (error) {
		const err = error as { statusCode?: number; data?: { tag?: string } }
		if (err.statusCode && err.data?.tag) throw error

		throw createAppError({
			statusCode: 500,
			message: 'Error appending to MCP AI journal',
			tag: 'api.mcp.ai_journal.error',
			error,
		})
	}
})
