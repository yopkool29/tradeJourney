import { PrismaClient } from '../generated/prisma-auth'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.POSTGRES_URL_AUTH
        }
    }
})

const defaultSettings = {
    language: 'fr',
    timezone: 'Europe/Paris',
    dateFormat: 'dd/MM/yyyy',
    currency: 'EUR'
}

async function main() {
    console.log('Starting to create admin user...')

    const adminToken = process.env.ADMIN_API_TOKEN!

    const existingUser = await prisma.user.findUnique({
        where: {
            email: 'admin@mail.fr'
        }
    })

    if (!existingUser) {
        const hashedPassword = await bcrypt.hash('admin', 10)

        const user = await prisma.user.create({
            data: {
                email: 'admin@mail.fr',
                password: hashedPassword,
                settings: JSON.stringify(defaultSettings),
                token: adminToken
            }
        })
        console.log(`✓ Admin user created with ID: ${user.id}`)
    } else {
        console.log('✓ Admin user already exists')
    }
}

main()
    .catch((e) => {
        console.error('✗ Error creating admin user:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
