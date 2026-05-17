import { getPrisma } from '../../utils/db'
import { Prisma } from '~/generated/prisma-data'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'
import { UpdateSymbolSchema } from '~/schema/symbol'

export default defineEventHandler(async (event) => {
    await auth(event)
    
    try {
        const prisma = await getPrisma(event)
        
        const body = await readBody(event)

        const parsed = UpdateSymbolSchema.safeParse(body)

        if (!parsed.success) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid symbol data',
                tag: 'api.config_symbols.update.validation_error'
            })
        }

        const id = parsed.data.id

        // Mettre à jour le symbole avec seulement les champs fournis (customFields n'est pas un champ Prisma)
        const { id: _, customFields: _customFields, ...updateData } = parsed.data

        // Merger customFields dans metadata côté serveur
        const customFields = body.customFields ?? null
        if (customFields) {
            const existing = await prisma.configSymbol.findUnique({ where: { id }, select: { metadata: true } })
            const currentMetadata = (existing?.metadata as Record<string, unknown>) ?? {}
            updateData.aliases = customFields.find((f: { key: string }) => f.key === 'aliases')?.value ?? updateData.aliases ?? ''
            ;(updateData as any).metadata = { ...currentMetadata, customFields }
        }

        try {
            const symbol = await prisma.configSymbol.update({
                where: { id },
                data: updateData as any
            });

            return symbol;

        } catch (error) {

            if (error instanceof Prisma.PrismaClientKnownRequestError && error?.code === 'P2025') { // Record not found
                throw createAppError({
                    statusCode: 404,
                    message: 'Symbol not found',
                    tag: 'api.config_symbols.update.not_found'
                })
            }
            throw error;
        }

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error while updating symbol',
            tag: 'api.config_symbols.update.error',
            error: error,
        })
    }
})
