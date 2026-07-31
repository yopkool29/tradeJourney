import { migrateImageUrlsInContent, migrateScreenshotUrl } from '~/server/utils/export-utils'
import { getApiContext } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
	const { prisma } = await getApiContext(event)

	const body = await readBody(event)
	const dryRun = body?.dryRun ?? false

	try {

		// Migrer les trades (metadata.detailedNote + screenshot.url)
		const trades = await prisma.trade.findMany({
			include: { screenshots: true }
		})

		let tradesUpdated = 0
		const tradeDetails: Array<{ id: number; screenshots: number; note: boolean }> = []

		for (const trade of trades) {
			const metadata = trade.metadata
			const migratedScreenshots = trade.screenshots.map(s => ({
				id: s.id,
				original: s.url,
				migrated: migrateScreenshotUrl(s.url)
			})).filter(s => s.original !== s.migrated)

			let migratedNote: string | null = null
			if (metadata && typeof metadata === 'object' && 'detailedNote' in metadata) {
				const detailedNote = metadata.detailedNote
				if (typeof detailedNote === 'string') {
					const result = migrateImageUrlsInContent(detailedNote)
					if (result !== detailedNote) migratedNote = result
				}
			}

			if (migratedScreenshots.length === 0 && !migratedNote) continue

			if (!dryRun) {
				for (const s of migratedScreenshots) {
					await prisma.screenshot.update({ where: { id: s.id }, data: { url: s.migrated } })
				}
				if (migratedNote && metadata && typeof metadata === 'object') {
					await prisma.trade.update({
						where: { id: trade.id },
						data: { metadata: { ...metadata, detailedNote: migratedNote } as any }
					})
				}
			}

			tradeDetails.push({
				id: trade.id,
				screenshots: migratedScreenshots.length,
				note: !!migratedNote
			})
			tradesUpdated++
		}

		// Migrer les dailyNotes
		const dailyNotes = await prisma.dailyNote.findMany({
			where: {
				content: {
					contains: '/api/image?path=user_'
				}
			}
		})

		let notesUpdated = 0
		const noteDetails: Array<{ id: number; date: string }> = []

		for (const note of dailyNotes) {
			if (note.content) {
				const migratedContent = migrateImageUrlsInContent(note.content)
				const dateStr = new Date(note.date).toISOString().split('T')[0]

				if (migratedContent === note.content) continue

				if (!dryRun) {
					await prisma.dailyNote.update({
						where: { id: note.id },
						data: { content: migratedContent as any }
					})
				}

				noteDetails.push({ id: note.id, date: dateStr })
				notesUpdated++
			}
		}

		return {
			success: true,
			dryRun,
			stats: {
				tradesUpdated,
				notesUpdated,
				total: tradesUpdated + notesUpdated
			},
			details: {
				trades: dryRun ? tradeDetails : undefined,
				notes: dryRun ? noteDetails : undefined
			},
			message: dryRun
				? `${tradesUpdated} trade(s) and ${notesUpdated} note(s) to migrate`
				: `${tradesUpdated} trade(s) and ${notesUpdated} note(s) migrated`
		}
	} catch (error: unknown) {
		console.error('Error while migrating URLs:', error)
		const err = error as { message?: string }
		throw createAppError({
			statusCode: 500,
			message: err.message || 'Error while migrating URLs',
			error
		})
	}
})
