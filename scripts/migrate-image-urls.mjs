import { PrismaClient } from '@prisma/client'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const migrateImageUrls = (content) => {
	if (!content) return content
	// Convertit: /api/image?path=user_X_data/ANY_DB/screenshots/file.png
	// En: /api/image?path=file.png
	return content.replace(/\/api\/image\?path=user_\d+_data\/[^/]+\/screenshots\/([^)\s"&]+)/g, '/api/image?path=$1')
}

const main = async () => {
	const args = process.argv.slice(2)
	
	// Check for --dry-run flag
	const dryRun = args.includes('--dry-run')
	const filteredArgs = args.filter(arg => arg !== '--dry-run')
	
	if (filteredArgs.length < 2) {
		console.error('Usage: node scripts/migrate-image-urls.mjs [userId] [dbName] [--dry-run]')
		console.error('Example: node scripts/migrate-image-urls.mjs 1 database_test')
		console.error('         node scripts/migrate-image-urls.mjs 1 database_test --dry-run')
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
	console.log(`🔄 Migration des URLs d'images pour user ${userId}, database ${dbName}\n`)

	// Connexion à la base de données spécifique
	const databaseUrl = `postgresql://postgres:postgres@localhost:5432/tradejourney_user_${userId}_${dbName}?schema=public`
	
	const prisma = new PrismaClient({
		datasources: {
			db: {
				url: databaseUrl
			}
		}
	})

	try {
		// Migrer les trades (metadata.detailedNote)
		console.log('📊 Migration des trades...')
		const trades = await prisma.trade.findMany({
			where: {
				metadata: {
					path: ['detailedNote'],
					not: null
				}
			}
		})

		let tradesUpdated = 0
		for (const trade of trades) {
			const metadata = trade.metadata
			if (metadata && typeof metadata === 'object' && 'detailedNote' in metadata) {
				const detailedNote = metadata.detailedNote
				if (typeof detailedNote === 'string' && detailedNote.includes('/api/image?path=user_')) {
					const migratedNote = migrateImageUrls(detailedNote)
					
					if (dryRun) {
						console.log(`  🔍 Trade #${trade.id} serait migré`)
						const oldUrls = detailedNote.match(/\/api\/image\?path=user_\d+_data\/[^/]+\/screenshots\/[^)\s"&]+/g)
						if (oldUrls) {
							oldUrls.forEach(url => console.log(`     - ${url}`))
						}
					} else {
						await prisma.trade.update({
							where: { id: trade.id },
							data: {
								metadata: {
									...metadata,
									detailedNote: migratedNote
								}
							}
						})
						console.log(`  ✅ Trade #${trade.id} migré`)
					}
					
					tradesUpdated++
				}
			}
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
				const migratedContent = migrateImageUrls(note.content)
				const dateStr = new Date(note.date).toISOString().split('T')[0]
				
				if (dryRun) {
					console.log(`  🔍 Daily note ${dateStr} serait migrée`)
					const oldUrls = note.content.match(/\/api\/image\?path=user_\d+_data\/[^/]+\/screenshots\/[^)\s"&]+/g)
					if (oldUrls) {
						oldUrls.forEach(url => console.log(`     - ${url}`))
					}
				} else {
					await prisma.dailyNote.update({
						where: { id: note.id },
						data: {
							content: migratedContent
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
		console.error('\n❌ Erreur lors de la migration:', error.message)
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

main()
