import jwt from 'jsonwebtoken'
import { createAppError } from './errors'

interface JWTPayload {
    userId?: string | number
    databaseId?: number
    dbName?: string
}

export default defineEventHandler(async (event) => {
    const token = getCookie(event, 'token')
    if (!token)
        throw createAppError({ statusCode: 401, tag: 'api.auth.verify.unauthorized', message: 'Unauthorized' })
    
    const secret = process.env.JWT_SECRET
    if (!secret)
        throw createAppError({ statusCode: 500, tag: 'api.auth.verify.missing_secret', message: 'JWT_SECRET not configured' })
    
    const payload = jwt.verify(token, secret) as JWTPayload
    
    if (!payload.userId)
        throw createAppError({ statusCode: 401, tag: 'api.auth.verify.unauthorized', message: 'Unauthorized' })

    // throw createAppError({ statusCode: 401, tag: 'api.auth.verify.unauthorized', message: 'Unauthorized' })

    // Store user and database info in context
    event.context.userId = String(payload.userId)
    event.context.databaseId = payload.databaseId
    event.context.dbName = payload.dbName
})
