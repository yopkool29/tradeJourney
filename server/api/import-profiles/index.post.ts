import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'
import { CreateImportProfileSchema } from '~/schema/importProfile'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        const body = await readBody(event)
        const parsed = CreateImportProfileSchema.parse(body)

        // Vérifier si un profil avec ce nom existe déjà
        const existing = await prisma.importProfile.findFirst({
            where: { name: parsed.name }
        })

        if (existing) {
            throw createAppError({
                statusCode: 400,
                message: 'An import profile with this name already exists',
                tag: 'api.import_profiles.create.name_exists'
            })
        }

        const profile = await prisma.importProfile.create({
            data: {
                name: parsed.name,
                provider: parsed.provider,
                importMode: parsed.importMode,
                timezone: parsed.timezone,
                keepExistingTrades: parsed.keepExistingTrades,
                instrumentType: parsed.instrumentType,
                metadata: parsed.metadata || undefined,
                dayTags: {
                    create: parsed.dayTagIds.map((tagId: number) => ({ tagId })),
                },
                tradeTags: {
                    create: parsed.tradeTagIds.map((tagId: number) => ({ tagId })),
                },
                ibkrFlexQueryToken: parsed.ibkrFlexQueryToken || null,
                ibkrFlexQueryId: parsed.ibkrFlexQueryId || null,
            },
            include: {
                dayTags: { select: { tagId: true } },
                tradeTags: { select: { tagId: true } },
            }
        })

        return profile

    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'An error occurred while creating the import profile',
            tag: 'api.import_profiles.create.server_error',
            error
        })
    }
})
