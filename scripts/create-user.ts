import { config } from 'dotenv'
import { getAuthDb } from '../server/utils/db'
import bcrypt from 'bcryptjs'
import { defaultSettings } from '../schema/user'

// Charger les variables d'environnement
config()

const prisma = getAuthDb()

async function main() {

    console.log('Starting to create user...')

    const adminToken = process.env.ADMIN_API_TOKEN!

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
                password: hashedPassword,
                settings: JSON.stringify(defaultSettings),
                token: adminToken
            }
        })
        console.log(`User created with ID: ${user.id}`)
    } else {
        console.log('User already exists')
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
