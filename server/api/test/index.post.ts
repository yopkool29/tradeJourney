import { stringify } from 'querystring'
import { createAppError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
    if (!import.meta.dev) {
        throw createAppError({
            statusCode: 404,
            message: 'API not available in production',
            tag: 'api.test.not_found'
        })
    }

    try {
        const body = await readBody(event)
        if (body.param && body.param === 'test1') {
            return {
                success: true,
                content: "test"
            }
        }

        throw createAppError({
            statusCode: 401,
            message: 'Invalid test parameter',
            tag: 'api.test.invalid_test'
        })

    } catch (error) {
        console.error('Error object:', JSON.stringify({
            error
        }, null, 2));

        if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'tag' in error.data)
            throw error


        throw createAppError({
            statusCode: 500,
            message: 'Internal server error',
            tag: 'api.test.server_error',
            error
        })
    }
})
