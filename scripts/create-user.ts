import { PrismaClient } from '../generated/prisma/client.js'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const existingUser = await prisma.user.findUnique({
        where: {
            email: 'admin@mail.fr'
        }
    })

    if (!existingUser) {
        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash('admin', 10)

        // Création de l'utilisateur
        const user = await prisma.user.create({
            data: {
                email: 'admin@mail.fr',
                password: hashedPassword
            }
        })

        console.log(`User created with ID: ${user.id}`)
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
