// Usage: npx tsx --require ./scripts/paths-register.cjs scripts/restore-all.ts <userId> <backup-dir>
// In Docker: docker exec -it <container> npx tsx --require ./scripts/paths-register.cjs scripts/restore-all.ts <userId> <backup-dir>

import { config } from 'dotenv'
import { getAuthDb, buildShemaName, buildRoleName, createUserDatabase } from '../server/utils/db'
import { restoreBackup } from '../server/utils/myexport'
import { readdir, rm, readFile, mkdtemp } from 'fs/promises'
import { join, resolve, basename } from 'path'
import { homedir, tmpdir } from 'os'
import extract from 'extract-zip'
import { existsSync } from 'fs'

config()

const normalizePath = (p: string) => {
	if (p.startsWith('~/')) {
		p = join(homedir(), p.slice(2))
	}
	p = p.replace(/^([A-Za-z]):\\/, (_m, drive) => '/mnt/' + drive.toLowerCase() + '/').replace(/\\/g, '/')
	return resolve(p)
}

const prisma = getAuthDb()

function extractDbNameFromFilename(filename: string): string | null {
	// Format: backup-{dbName}-{appVersion}-{date}-{id}.zip
	// dbName contains only lowercase letters, numbers, underscores (no dashes)
	const match = filename.match(/^backup-([a-z0-9_]+)-/)
	if (match) {
		return match[1]
	}
	return null
}

async function extractDbNameFromManifest(zipPath: string): Promise<string | null> {
	const tempDir = await mkdtemp(join(tmpdir(), 'restore-'))
	try {
		await extract(zipPath, { dir: tempDir })
		const manifestPath = join(tempDir, 'manifest.json')
		if (!existsSync(manifestPath)) return null
		const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'))
		// Check if manifest has dbName in metadata (future-proof)
		if (manifest.metadata?.dbName) {
			return manifest.metadata.dbName
		}
		return null
	} catch {
		return null
	} finally {
		await rm(tempDir, { recursive: true, force: true })
	}
}

async function deleteDatabase(userId: number, dbId: number, dbName: string) {
	const schemaName = buildShemaName(userId, dbName)
	const roleName = buildRoleName(userId, dbName)

	try {
		await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
		await prisma.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`)
	} catch (e) {
		console.error(`  Failed to drop schema/role for "${dbName}":`, e instanceof Error ? e.message : e)
	}

	try {
		await prisma.database.delete({ where: { id: dbId } })
	} catch {
		// Record may not exist
	}
}

async function main() {
	const userIdArg = process.argv[2]
	const srcArg = process.argv[3]
	if (!userIdArg || !srcArg) {
		console.error('Usage: tsx scripts/restore-all.ts <userId> <backup-dir>')
		console.error('Example: tsx scripts/restore-all.ts 1 ~/Dropbox/statsbook/dev')
		process.exit(1)
	}

	const userId = parseInt(userIdArg, 10)
	if (Number.isNaN(userId)) {
		console.error('Invalid userId:', userIdArg)
		process.exit(1)
	}

	const srcDir = normalizePath(srcArg)
	if (!existsSync(srcDir)) {
		console.error('Backup directory not found:', srcDir)
		process.exit(1)
	}

	// Find all zip files
	const entries = await readdir(srcDir, { withFileTypes: true })
	const zipFiles = entries.filter(e => e.isFile() && e.name.endsWith('.zip')).map(e => join(srcDir, e.name))

	if (zipFiles.length === 0) {
		console.log('No zip files found in:', srcDir)
		return
	}

	console.log(`Found ${zipFiles.length} backup file(s).`)

	// Extract dbName from each zip
	const backups: { path: string; dbName: string }[] = []
	for (const zipPath of zipFiles) {
		const filename = basename(zipPath)
		let dbName = extractDbNameFromFilename(filename)
		if (!dbName) {
			console.log(`  Extracting manifest from "${filename}" to find dbName...`)
			dbName = await extractDbNameFromManifest(zipPath)
		}
		if (!dbName) {
			console.error(`  Could not determine database name for "${filename}", skipping`)
			continue
		}
		backups.push({ path: zipPath, dbName })
		console.log(`  "${filename}" -> database: "${dbName}"`)
	}

	if (backups.length === 0) {
		console.log('No valid backup files found.')
		return
	}

	// Delete all existing databases for this user
	console.log(`\nDeleting all existing databases for user ${userId}...`)
	const existingDbs = await prisma.database.findMany({ where: { userId } })
	for (const db of existingDbs) {
		console.log(`  Deleting "${db.name}" (id: ${db.id})...`)
		await deleteDatabase(userId, db.id, db.name)
	}
	console.log(`Deleted ${existingDbs.length} database(s).`)

	// Recreate and restore each database
	console.log('\nRestoring databases...')
	const results: { dbName: string; success: boolean; error?: string }[] = []
	for (const { path: zipPath, dbName } of backups) {
		console.log(`\n  Restoring "${dbName}"...`)
		try {
			// Create the database (schema + role + record)
			await createUserDatabase(userId, dbName, dbName)
			console.log(`  Database "${dbName}" created.`)

			// Restore the backup
			await restoreBackup(zipPath, userId, dbName)
			console.log(`  Backup restored to "${dbName}".`)
			results.push({ dbName, success: true })
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : String(e)
			console.error(`  FAILED to restore "${dbName}":`, errorMsg)
			results.push({ dbName, success: false, error: errorMsg })
		}
	}

	console.log('\nRestore summary:')
	console.table(results)

	const succeeded = results.filter(r => r.success).length
	const failed = results.filter(r => !r.success).length
	console.log(`\nDone: ${succeeded} succeeded, ${failed} failed.`)
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
