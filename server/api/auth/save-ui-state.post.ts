import { getAuthDb } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'
import { gunzipSync } from 'node:zlib'

export default defineEventHandler(async (event) => {
    await auth(event)

    const prisma = getAuthDb()
    const userId = parseInt(event.context.userId)

    try {
        const body = await readBody(event)

        if (!body || typeof body !== 'object') {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid UI state data',
                tag: 'api.auth.save_ui_state.validation_error',
            })
        }

        let uiState: unknown
        if (typeof body.compressed === 'string') {
            const buf = Buffer.from(body.compressed, 'base64')
            const decompressed = gunzipSync(buf)
            uiState = JSON.parse(decompressed.toString('utf-8'))
        } else {
            uiState = body
        }

        if (!uiState || typeof uiState !== 'object') {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid UI state data',
                tag: 'api.auth.save_ui_state.validation_error',
            })
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { metadata: true }
        })

        if (!existingUser) {
            throw createAppError({
                statusCode: 404,
                message: 'User not found',
                tag: 'api.auth.save_ui_state.user_not_found'
            })
        }

        const version = typeof body.version === 'number' ? body.version : 1

        const existingMetadata = (existingUser.metadata as Record<string, unknown> | null) ?? {}
        const existingPnlTracker = (existingMetadata.pnltracker as Record<string, unknown> | null) ?? {}
        const updatedMetadata = {
            ...existingMetadata,
            pnltracker: {
                ...existingPnlTracker,
                uiState: uiState,
                uiStateVersion: version,
                uiStateSavedAt: new Date().toISOString(),
            },
        }

        await prisma.user.update({
            where: { id: userId },
            data: { metadata: updatedMetadata }
        })

        return { success: true }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while saving UI state',
            tag: 'api.auth.save_ui_state.server_error',
            error
        })
    }
})
