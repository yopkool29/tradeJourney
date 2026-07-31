import { config } from 'dotenv'
import { getDataDbUnsafe } from '../server/utils/db'
import { migrateImageUrlsInContent, migrateScreenshotUrl } from '../server/utils/export-utils'

// Charger les variables d'environnement
config()

const main = async () => {
	const args = process.argv.slice(2)
	
	// Check for --dry-run flag
	const dryRun = args.includes('--dry-run')
	const filteredArgs = args.filter(arg => arg !== '--dry-run')
	
	if (filteredArgs.length < 2) {
		console.error('Usage: npx tsx scripts/migrate-image-urls.ts [userId] [dbName] [--dry-run]')
		console.error('Example: npx tsx scripts/migrate-image-urls.ts 1 database_test')
		console.error('         npx tsx scripts/migrate-image-urls.ts 1 database_test --dry-run')
		process.exit(1)
	}

	const userId = parseInt(filteredArgs[0], 10)
	const dbName = filteredArgs[1]

	if (isNaN(userId)) {
		console.error('Error: userId must be a number')
		process.exit(1)
	}

	if (dryRun) {
		console.log(`\n🔍 DRY RUN - Aperçu des migrations (aucune modification)\n`)
	}
	console.log(`\n🔄 Migration des URLs d'images pour user ${userId}, database ${dbName}\n`)

	// Utiliser getDataDbUnsafe pour la connexion dynamique à la base de données
	const prisma = getDataDbUnsafe(userId, dbName)

	try {
		// Migrer les trades (metadata.detailedNote + screenshot.url)
		console.log('📊 Migration des trades...')
		const trades = await prisma.trade.findMany({
			include: { screenshots: true }
		})

		let tradesUpdated = 0
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

			if (dryRun) {
				console.log(`  🔍 Trade #${trade.id} serait migré`)
				migratedScreenshots.forEach(s => console.log(`     screenshot: ${s.original} → ${s.migrated}`))
				if (migratedNote) console.log(`     detailedNote: URLs migrées`)
			} else {
				for (const s of migratedScreenshots) {
					await prisma.screenshot.update({ where: { id: s.id }, data: { url: s.migrated } })
				}
				if (migratedNote && metadata && typeof metadata === 'object') {
					await prisma.trade.update({
						where: { id: trade.id },
						data: { metadata: { ...metadata, detailedNote: migratedNote } as unknown as Record<string, unknown> }
					})
				}
				console.log(`  ✅ Trade #${trade.id} migré`)
			}

			tradesUpdated++
		}
		console.log(`${dryRun ? '🔍' : '✨'} ${tradesUpdated} trade(s) ${dryRun ? 'à migrer' : 'migré(s)'}\n`)

		// Migrer les dailyNotes
		console.log('📝 Migration des daily notes...')
		const dailyNotes = await prisma.dailyNote.findMany({
			where: {
				content: {
					contains: '/api/image?path=user_'
				}
			}
		})

		let notesUpdated = 0
		for (const note of dailyNotes) {
			if (note.content) {
				const migratedContent = migrateImageUrlsInContent(note.content)
				const dateStr = new Date(note.date).toISOString().split('T')[0]
				
				if (migratedContent === note.content) continue

				if (dryRun) {
					console.log(`  🔍 Daily note ${dateStr} serait migrée`)
				} else {
					await prisma.dailyNote.update({
						where: { id: note.id },
						data: {
							content: migratedContent as unknown as string
						}
					})
					console.log(`  ✅ Daily note ${dateStr} migrée`)
				}
				
				notesUpdated++
			}
		}
		console.log(`${dryRun ? '🔍' : '✨'} ${notesUpdated} daily note(s) ${dryRun ? 'à migrer' : 'migrée(s)'}\n`)

		if (dryRun) {
			console.log(`\n🔍 DRY RUN - Aperçu terminé (aucune modification effectuée)`)
		} else {
			console.log(`\n✅ Migration terminée avec succès!`)
		}
		console.log(`   - ${tradesUpdated} trades ${dryRun ? 'à migrer' : 'migrés'}`)
		console.log(`   - ${notesUpdated} daily notes ${dryRun ? 'à migrer' : 'migrées'}`)
		console.log(`   - Total: ${tradesUpdated + notesUpdated} enregistrements\n`)

	} catch (error) {
		console.error('\n❌ Erreur lors de la migration:', (error as Error).message)
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

main()
