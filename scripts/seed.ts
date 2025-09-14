import { PrismaClient } from '../generated/prisma/client.js'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // Vérifie si l'utilisateur existe déjà
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
    } else {
        console.log('User already exists, no need to create it.')
    }

    const existingSymbol = await prisma.configSymbol.findUnique({
        where: {
            symbol: 'EURUSD'
        }
    })

    if (!existingSymbol) {
        await prisma.configSymbol.create({
            data: {
                symbol: 'EURUSD',
                digit: 6,
                active: true,
                notes: 'EUR/USD notes'
            }
        })
        console.log('EUR/USD created with ID: ${user.id}')
    } else {
        console.log('EUR/USD already exists, no need to create it.')
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
