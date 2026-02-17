#!/usr/bin/env node
/**
 * Reset all PostgreSQL auto-increment sequences for a user schema.
 * Usage: node scripts/reset-sequences.mjs [schemaName]
 * Example: node scripts/reset-sequences.mjs user_1_db_database_tokyo_exit
 */
import { PrismaClient } from '../generated/prisma-data/index.js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env manually
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
    }
}

const schema = process.argv[2]
if (!schema) {
    console.error('Usage: node scripts/reset-sequences.mjs <schemaName>')
    console.error('Example: node scripts/reset-sequences.mjs user_1_db_database_tokyo_exit')
    process.exit(1)
}

const baseUrl = process.env.POSTGRES_URL_TEMPLATE
if (!baseUrl) {
    console.error('POSTGRES_URL_TEMPLATE not found in .env')
    process.exit(1)
}

const separator = baseUrl.includes('?') ? '&' : '?'
const url = `${baseUrl}${separator}schema=${schema}`

const prisma = new PrismaClient({ datasources: { db: { url } } })

const tables = [
    'TagGroup', 'Tag', 'Account', 'Trade', 'Screenshot',
    'DayTag', 'DailyNote', 'ConfigSymbol', 'ImportProfile'
]

for (const table of tables) {
    try {
        const result = await prisma.$queryRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false) as new_val`
        )
        console.log(`✓ ${table}: sequence reset to ${result[0].new_val}`)
    } catch (e) {
        console.log(`- ${table}: skipped (${e.message?.substring(0, 60)})`)
    }
}

await prisma.$disconnect()
console.log('\nDone.')
