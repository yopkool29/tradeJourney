import { PrismaClient } from '../generated/prisma/client.js'
import { readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

const prisma = new PrismaClient()
const SCREENSHOTS_DIR = join(process.cwd(), 'upload/screenshots')

async function deleteAllData() {
    console.log('Starting to delete all data...')

    // Désactiver les contraintes de clé étrangère temporairement (spécifique à SQLite)
    await prisma.$executeRaw`PRAGMA foreign_keys = OFF`

    try {
        // Supprimer les données dans l'ordre inverse des dépendances
        await prisma.dayTagAssociation.deleteMany()
        console.log('Deleted all DayTagAssociation records')

        await prisma.tradeTagAssociation.deleteMany()
        console.log('Deleted all TradeTagAssociation records')

        await prisma.dayTag.deleteMany()
        console.log('Deleted all DayTag records')

        await prisma.tag.deleteMany()
        console.log('Deleted all Tag records')

        await prisma.tagGroup.deleteMany()
        console.log('Deleted all TagGroup records')

        await prisma.screenshot.deleteMany()
        console.log('Deleted all Screenshot records')

        await prisma.trade.deleteMany()
        console.log('Deleted all Trade records')

        await prisma.account.deleteMany()
        console.log('Deleted all Account records')

        await prisma.configSymbol.deleteMany()
        console.log('Deleted all ConfigSymbol records')

        // Supprimer les fichiers de screenshots
        try {
            const files = await readdir(SCREENSHOTS_DIR)
            await Promise.all(
                files.map(file =>
                    unlink(join(SCREENSHOTS_DIR, file)).catch(console.error)
                )
            )
            console.log(`Deleted ${files.length} files from ${SCREENSHOTS_DIR}`)
        } catch (error: unknown) {
            const nodeError = error as NodeJS.ErrnoException
            if (nodeError.code !== 'ENOENT') { // Ignorer si le dossier n'existe pas
                console.error('Error deleting screenshot files:', nodeError)
            } else {
                console.log('Screenshots directory does not exist, skipping...')
            }
        }

        console.log('Successfully deleted all data except Users and their files')
    } finally {
        // Réactiver les contraintes de clé étrangère
        await prisma.$executeRaw`PRAGMA foreign_keys = ON`
    }
}

async function main() {
    try {
        await deleteAllData()
    } catch (error) {
        console.error('Error deleting data:', error)
        throw error
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
