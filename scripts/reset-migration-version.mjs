/**
 * Reset migrationVersion to 1 for all active databases
 * Usage: node scripts/reset-migration-version.mjs
 * 
 * This forces re-application of migration v2 on next server connection.
 * Safe thanks to IF NOT EXISTS in the migration SQL.
 */
import { PrismaClient } from '../generated/prisma-auth/index.js'

const prisma = new PrismaClient()

async function main() {
    const databases = await prisma.database.findMany()

    if (databases.length === 0) {
        console.log('⚠️  No databases found.')
        return
    }

    console.log(`Found ${databases.length} database(s):\n`)
    for (const db of databases) {
        console.log(`  - ${db.schemaName} (${db.displayName}): v${db.migrationVersion}`)
    }

    const result = await prisma.database.updateMany({
        data: { migrationVersion: 1 }
    })

    console.log(`\n🎉 Done. ${result.count} database(s) reset to migrationVersion 1.`)
    console.log('   Restart the server and connect to each DB to trigger migration v2.')
}

main()
    .catch((e) => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
