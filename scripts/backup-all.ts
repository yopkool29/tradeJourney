import { config } from 'dotenv'
import { getAuthDb } from '../server/utils/db'
import { createBackup } from '../server/utils/myexport'
import { copyFile, readdir, rm } from 'fs/promises'
import { join, resolve } from 'path'
import { homedir } from 'os'

// Charger les variables d'environnement
config()

const normalizePath = (p: string) => {
    // Expand tilde to home directory
    if (p.startsWith('~/')) {
        p = join(homedir(), p.slice(2))
    }
    // Convert Windows paths (C:\Users\...) to WSL paths (/mnt/c/Users/...)
    p = p.replace(/^([A-Za-z]):\\/, (_m, drive) => '/mnt/' + drive.toLowerCase() + '/').replace(/\\/g, '/')
    return resolve(p)
}

const prisma = getAuthDb()

async function clearZips(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.zip')) {
            await rm(join(dir, entry.name), { force: true })
        }
    }
}

async function main() {
    const userIdArg = process.argv[2]
    const destArg = process.argv[3]
    if (!userIdArg) {
        console.error('Usage: tsx scripts/backup-all.ts <userId> [dest-dir]')
        process.exit(1)
    }

    const userId = parseInt(userIdArg, 10)
    if (Number.isNaN(userId)) {
        console.error('Invalid userId:', userIdArg)
        process.exit(1)
    }

    console.log(`Fetching databases for user ${userId}...`)

    const databases = await prisma.database.findMany({
        where: { userId },
        orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'asc' }
        ]
    })

    if (databases.length === 0) {
        console.log('No databases found for this user.')
        return
    }

    console.log(`Found ${databases.length} database(s). Starting backup...`)

    const appVersion = process.env.APP_VERSION || '0.0.0'
    const results: { dbName: string; path: string }[] = []

    let destDir = ''
    if (destArg) {
        destDir = normalizePath(destArg)
        console.log(`Clearing zip files in: ${destDir}`)
        await clearZips(destDir)
    }

    for (const db of databases) {
        try {
            console.log(`  Backing up "${db.name}"...`)
            const path = await createBackup(userId, db.name, appVersion)
            results.push({ dbName: db.name, path })
            console.log(`  -> ${path}`)

            if (destDir) {
                const dest = join(destDir, path.split('/').pop()!)
                await copyFile(path, dest)
                console.log(`  -> copied to ${dest}`)
            }
        } catch (e) {
            console.error(`  FAILED to backup "${db.name}":`, e instanceof Error ? e.message : e)
        }
    }

    console.log('\nBackup summary:')
    console.table(results)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
