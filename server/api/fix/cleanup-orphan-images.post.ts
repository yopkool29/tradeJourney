import { readdir, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getPrisma } from '../../utils/db'
import auth from '../../utils/auth'
import { createAppError } from '../../utils/errors'
import { getScreenshotUploadPath } from '../../utils/index'

export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)

        const userId = event.context.userId
        
        const dbName = event.context.dbName

        if (!userId || !dbName) {
            throw createAppError({
                statusCode: 401,
                message: 'User not authenticated or database not selected',
                tag: 'api.fix.cleanup_orphan_images.unauthorized'
            })
        }

        const body = await readBody(event) as { dryRun?: boolean }
        const dryRun = body?.dryRun ?? false

        const uploadDir = resolve(process.cwd(), getScreenshotUploadPath(userId, dbName))

        // Get all files in upload directory
        const files = await readdir(uploadDir).catch(() => [] as string[])

        // Get all notes content
        const notes = await prisma.dailyNote.findMany({
            select: { content: true }
        })

        // Get all trades with screenshots
        const trades = await prisma.trade.findMany({
            select: { screenshots: true }
        })

        // Build sets of referenced filenames separately
        const noteFiles = new Set<string>()
        const tradeFiles = new Set<string>()

        // Extract filenames from notes content
        for (const note of notes) {
            if (!note.content) continue
            // Match nt_XXX_YYYY.png and tmp_nt_XXX_YYYY.png patterns
            const matches = note.content.match(/(?:tmp_)?nt_\d+_\d+_[a-z0-9]+\.png/g)
            if (matches) {
                matches.forEach(m => noteFiles.add(m))
            }
        }

        // Extract filenames from trade screenshots (handle various formats)
        for (const trade of trades) {
            if (!trade.screenshots) continue
            for (const screenshot of trade.screenshots) {
                if (screenshot.url) {
                    // Try nt_ pattern first
                    let match = screenshot.url.match(/(?:tmp_)?nt_\d+_\d+_[a-z0-9]+\.png/)
                    if (match) {
                        tradeFiles.add(match[0])
                    } else {
                        // Try generic screenshot filename pattern
                        match = screenshot.url.match(/screenshots\/([^\s&/)]+\.png)/)
                        if (match) {
                            tradeFiles.add(match[1])
                        }
                    }
                }
            }
        }

        // Merge all referenced files
        const referencedFiles = new Set<string>([...noteFiles, ...tradeFiles])

        // Find orphan images (check all image files)
        const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])
        const orphanFiles: string[] = []
        const nonImageFiles: string[] = []
        for (const file of files) {
            const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
            if (!imageExtensions.has(ext)) {
                nonImageFiles.push(file)
                continue
            }
            if (!referencedFiles.has(file)) {
                orphanFiles.push(file)
            }
        }

        // Delete orphan files if not dry run
        const deleted: string[] = []
        if (!dryRun) {
            for (const file of orphanFiles) {
                try {
                    await unlink(resolve(uploadDir, file))
                    deleted.push(file)
                } catch {
                    // Ignore errors for individual files
                }
            }
        }

        return {
            success: true,
            dryRun,
            stats: {
                totalFiles: files.length,
                totalImageFiles: files.filter(f => imageExtensions.has(f.slice(f.lastIndexOf('.')).toLowerCase())).length,
                referencedFiles: referencedFiles.size,
                referencedFromNotes: noteFiles.size,
                referencedFromTrades: tradeFiles.size,
                orphanFiles: orphanFiles.length,
                nonImageFiles: nonImageFiles.length,
                deleted: deleted.length
            },
            orphanFiles: orphanFiles.slice(0, 50), // Limit output
            nonImageFiles: nonImageFiles.slice(0, 10),
            message: dryRun
                ? `Dry run: ${orphanFiles.length} orphan images found (not deleted)`
                : `${deleted.length} orphan images deleted successfully`
        }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error cleaning up orphan images',
            tag: 'api.fix.cleanup_orphan_images.error',
            error
        })
    }
})
