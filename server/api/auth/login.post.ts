import { getAuthDb } from '../../utils/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { setCookie } from 'h3'
import { createAppError } from '../../utils/errors'


export default defineEventHandler(async (event) => {
    try {
        const { email, password } = await readBody(event)

        // Validation des entrées
        if (!email || !password) {
            throw createAppError({
                statusCode: 400,
                message: 'Email and password are required',
                tag: 'api.auth.login.missing_credentials'
            })
        }

        const authDb = getAuthDb()
        const user = await authDb.user.findUnique({ 
            where: { email },
            include: { databases: true }
        })
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw createAppError({
                statusCode: 401,
                message: 'Invalid email or password',
                tag: 'api.auth.login.invalid_credentials'
            })
        }

        // Générer un JWT (sans database pour l'instant, sera ajouté après sélection)
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        )

        // Définir le cookie avec options de sécurité
        setCookie(event, 'token', token, {
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        })

        return {
            id: user.id,
            email: user.email,
            token: user.token,
            settings: user.settings,
            metadata: user.metadata,
            databases: user.databases.map(db => ({
                id: db.id,
                name: db.name,
                displayName: db.displayName,
                isDefault: db.isDefault
            }))
        }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred during authentication',
            tag: 'api.auth.login.server_error',
            error
        })
    }
})