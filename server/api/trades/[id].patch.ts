import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { deleteFiles } from '../../utils'
import { createAppError } from '../../utils/errors'
import { UpdateTradeSchema } from '~/schema/trade'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        
        const userId = Number(event.context.userId)
        const dbName = event.context.dbName as string
        
        const id = parseInt(event.context.params?.id || '')

        if (isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid trade ID',
                tag: 'api.trades.patch.invalid_id'
            })
        }

        // Vérifier que le trade appartient bien à l'utilisateur
        const existing = await prisma.trade.findUnique({ where: { id } })
        if (!existing) {
            throw createAppError({
                statusCode: 403,
                message: 'Not authorized to update this trade',
                tag: 'api.trades.patch.unauthorized'
            })
        }

        const body = await readBody(event)

        const parsed = UpdateTradeSchema.parse(body)

        // Extraire l'ID et isoler les données à mettre à jour
        const { id: _, screenshots, metadata: incomingMetadata, detailedNote, ...restData } = parsed

        // Merge metadata with existing values to avoid overwriting option fields
        const existingMetadata: Record<string, unknown> = existing.metadata
            ? (typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : existing.metadata as Record<string, unknown>)
            : {}

        let mergedMetadata: Record<string, unknown> | null = null
        if (incomingMetadata !== undefined || detailedNote !== undefined) {
            mergedMetadata = { ...existingMetadata }
            if (incomingMetadata !== undefined) {
                Object.assign(mergedMetadata, incomingMetadata as Record<string, unknown>)
            }
            if (detailedNote !== undefined) {
                if (detailedNote.trim()) {
                    mergedMetadata.detailedNote = detailedNote
                } else {
                    delete mergedMetadata.detailedNote
                }
            }
        }

        type PrismaUpdateInput = typeof restData & {
            metadata?: Record<string, unknown> | null;
            screenshots?: {
                deleteMany: Record<string, unknown>;
                create?: Array<{ url: string }>;
            };
        }

        const updateData: PrismaUpdateInput = {
            ...restData,
            ...(incomingMetadata !== undefined && { metadata: mergedMetadata }),
        }

        // Gérer correctement les screenshots pour Prisma
        // Seulement si screenshots est défini dans les données envoyées
        if (screenshots !== undefined) {
            // Extraire les IDs des screenshots existants à conserver
            const screenshotIds = screenshots
                .filter(s => typeof s !== 'string' && s.id)
                .map(s => s.id as number)

            // Récupérer les screenshots qui vont être supprimés pour pouvoir supprimer les fichiers
            const screenshotsToDelete = await prisma.screenshot.findMany({
                where: {
                    tradeId: id,
                    id: {
                        notIn: screenshotIds
                    }
                }
            })

            deleteFiles(screenshotsToDelete, userId, dbName)

            // Format attendu par Prisma pour les relations
            updateData.screenshots = {
                // Supprimer uniquement les screenshots qui ne sont pas dans la liste
                deleteMany: {
                    id: {
                        notIn: screenshotIds
                    }
                },
            }

            // Ajouter les nouveaux screenshots s'il y en a (ceux sans ID)
            const newScreenshots = screenshots.filter(s => typeof s === 'string' || !s.id)
            if (newScreenshots.length > 0) {
                updateData.screenshots.create = newScreenshots.map(s => ({
                    url: typeof s === 'string' ? s : s.url,
                }))
            }
        } else {
            // Si screenshots n'est pas défini, on récupère tous les screenshots existants pour les supprimer
            const screenshotsToDelete = await prisma.screenshot.findMany({
                where: {
                    tradeId: id
                }
            })

            deleteFiles(screenshotsToDelete, userId, dbName)

            // Supprimer tous les screenshots de la base de données
            updateData.screenshots = {
                deleteMany: {}
            }
        }

        // Mise à jour partielle du trade (seulement s'il est actif)
        const trade = await prisma.trade.update({
            where: { id, active: true },
            data: updateData
        }).catch((error) => {
            if (error.code === 'P2025') {
                throw createAppError({
                    statusCode: 404,
                    message: 'Trade not found or not active',
                    tag: 'api.trades.patch.not_found_or_inactive',
                    error: error
                })
            }
            throw error
        })

        return trade
        
    } catch (error: unknown) {

        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error while updating trade',
            tag: 'api.trades.patch.error',
            error: error instanceof Error ? error.message : 'Unknown error'
        })
    }
})

