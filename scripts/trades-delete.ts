import { PrismaClient } from '../generated/prisma/client.js'

const prisma = new PrismaClient()

async function main() {
    // Vérifie si l'utilisateur existe déjà
    const cnt = await prisma.trade.count()

    console.log(`Trades count before: ${cnt}`)

    await prisma.trade.deleteMany()

    const cntAfter = await prisma.trade.count()

    console.log(`Trades count after: ${cntAfter}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
