import { getApiContext, getValidatedId } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
    try {
        const { prisma } = await getApiContext(event)

        const id = getValidatedId(event, 'id', 'api.day_tags.delete.invalid_id')

        // Vérifier que le DayTag existe
        const existingDayTag = await prisma.dayTag.findUnique({
            where: { id }
        })

        if (!existingDayTag) {
            throw createAppError({
                statusCode: 404,
                message: 'Day tag not found',
                tag: 'api.day_tags.delete.not_found'
            })
        }
        
        await prisma.dayTag.delete({
            where: { id }
        })
        
        return { 
            success: true, 
            message: 'Day tag successfully deleted',
        }
    
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }
        
        throw createAppError({
            statusCode: 500,
            message: 'Error while deleting day tag',
            tag: 'api.day_tags.delete.error',
            error: error
        })
    }
})
