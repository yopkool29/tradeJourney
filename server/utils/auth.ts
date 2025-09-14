import jwt from 'jsonwebtoken'
import { createAppError } from './errors'

export default defineEventHandler(async (event) => {
    const token = getCookie(event, 'token')
    if (!token)
        throw createAppError({ statusCode: 401, tag: 'api.auth.verify.unauthorized', message: 'Unauthorized' })
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret') as { userId?: string | null }
    if (!payload.userId)
        throw createAppError({ statusCode: 401, tag: 'api.auth.verify.unauthorized', message: 'Unauthorized' })
    event.context.userId = payload.userId
})
