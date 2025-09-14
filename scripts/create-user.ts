import { PrismaClient } from '../generated/prisma/client.js'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const existingUser = await prisma.user.findUnique({
        where: {
            email: 'plindivat@free.fr'
        }
    })

    if (!existingUser) {
        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash('admin', 10)

        // Création de l'utilisateur
        const user = await prisma.user.create({
            data: {
                email: 'plindivat@free.fr',
                password: hashedPassword
            }
        })

        console.log(`User created with ID: ${user.id}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
