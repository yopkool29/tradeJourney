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

        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Internal server error',
            tag: 'api.test.server_error',
            error
        })
    }
})
