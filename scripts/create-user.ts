import { PrismaClient } from '../generated/prisma-auth'
import { config } from 'dotenv'
import { resolve } from 'path'
import bcrypt from 'bcryptjs'
import { defaultSettings } from '../schema/user'

// Charger explicitement le .env depuis le répertoire courant
config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient({
	datasources: {
		db: {
			url: process.env.POSTGRES_URL_AUTH!
		}
	}
})

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
