/**
 * Nettoie les DayTags et DayTagAssociations orphelins
 * - Supprime les DayTags sans trades et sans note
 * - Supprime les DayTagAssociations sans DayTag parent
 * À appeler après la suppression de trades
 */
export async function cleanupDayTagData(prisma: any) {
    // 1. Nettoyer les DayTags orphelins (sans trades et sans note)
    const allDayTags = await prisma.dayTag.findMany({
        select: { id: true, date: true, note: true }
    })

    for (const dayTag of allDayTags) {
        const tradesCount = await prisma.trade.count({
            where: {
                openDate: {
                    gte: new Date(new Date(dayTag.date).setHours(0, 0, 0, 0)),
                    lt: new Date(new Date(dayTag.date).setHours(23, 59, 59, 999))
                }
            }
        })

        // Si pas de trades et pas de note, supprimer le DayTag
        // (les DayTagAssociation seront supprimées automatiquement via onDelete: Cascade)
        if (tradesCount === 0 && (!dayTag.note || dayTag.note.trim() === '')) {
            await prisma.dayTag.delete({
                where: { id: dayTag.id }
            })
        }
    }

    // 2. Nettoyer les DayTagAssociations orphelines (sans DayTag parent)
    // Récupérer tous les IDs de DayTags existants
    const existingDayTagIds = await prisma.dayTag.findMany({
        select: { id: true }
    })
    const validDayTagIds = existingDayTagIds.map((dt: { id: number }) => dt.id)

    // Supprimer les associations dont le dayTagId n'existe plus
    await prisma.dayTagAssociation.deleteMany({
        where: {
            dayTagId: {
                notIn: validDayTagIds
            }
        }
    })
}
