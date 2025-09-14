import { prisma } from '../utils/prisma'
import bcrypt from 'bcryptjs'
import { createAppError } from '../utils/errors'

export default defineEventHandler(async (event) => {
    try {
        const { email, password } = await readBody(event)

        // Vérification des champs requis
        if (!email || !password) {
            throw createAppError({
                statusCode: 400,
                message: 'Email and password are required',
                tag: 'api.register.missing_fields'
            })
        }

        // Vérification si l'email existe déjà
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            throw createAppError({
                statusCode: 400,
                message: 'This email is already registered',
                tag: 'api.register.email_exists'
            })
        }

        // Hachage du mot de passe et création de l'utilisateur
        const hash = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({ 
            data: { 
                email, 
                password: hash,
                settings: '{}' // Ajout d'un objet settings vide par défaut
            } 
        })

        return { 
            id: user.id, 
            email: user.email 
        }

    } catch (error) {
        const err = error as { statusCode?: number; tag?: string }
        if (err.statusCode && err.tag) {
            throw err
        }
        
        throw createAppError({
            statusCode: 500,
            message: 'An error occurred during registration',
            tag: 'api.register.server_error',
            error
        })
    }
})

