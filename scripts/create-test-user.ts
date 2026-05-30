import { config } from 'dotenv'
import { getAuthDb } from '../server/utils/db'
import bcrypt from 'bcryptjs'
import { defaultSettings } from '../schema/user'

// Charger les variables d'environnement
config()

const prisma = getAuthDb()

async function main() {

    console.log('Starting to create user...')

    const existingUser = await prisma.user.findUnique({
        where: {
            email: 'test@example.com'
        }
    })

    if (!existingUser) {
        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash('testpassword', 10)

        // Generate unique token for test user
        const uniqueToken = `test_token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

        // Création de l'utilisateur
        const user = await prisma.user.create({
            data: {
                email: 'test@example.com',
                password: hashedPassword,
                settings: JSON.stringify(defaultSettings),
                token: uniqueToken
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
