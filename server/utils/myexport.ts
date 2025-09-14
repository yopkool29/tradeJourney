import { dirname, join } from 'node:path'
import { existsSync, createWriteStream } from 'node:fs'
import { mkdir, readdir, readFile, rm, stat, writeFile, copyFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import archiver from 'archiver'
import { formatDateForFilename } from '~/utils'
import extract from 'extract-zip'
import { prisma } from '../utils/prisma'

const UPLOAD_DIR = join(process.cwd(), 'upload/screenshots')
const EXPORT_DIR = join(process.cwd(), 'temp/exports')

interface ExportManifest {
    id: string
    createdAt: string
    dataFile: string
    uploads: string[]
    metadata: {
        version: string
        totalFiles: number
        totalSize: number
        dataStats: {
            accounts: number
            tagGroups: number
            tags: number
            trades: number
            dayTags: number
            configSymbols: number
            dailyNotes: number
        }
    }
}

interface ImportData {
    accounts: Awaited<ReturnType<typeof prisma.account.findMany>>
    tagGroups: Awaited<ReturnType<typeof prisma.tagGroup.findMany>>
    tags: Awaited<ReturnType<typeof prisma.tag.findMany>>
    trades: Awaited<ReturnType<typeof prisma.trade.findMany<{
        include: {
            tags: {
                include: {
                    tag: true
                }
            }
            screenshots: true
        }
    }>>>
    dayTags: Awaited<ReturnType<typeof prisma.dayTag.findMany<{
        include: {
            DayTagAssociation: {
                include: {
                    tag: true
                }
            }
        }
    }>>>
    configSymbols: Awaited<ReturnType<typeof prisma.configSymbol.findMany>>
    dailyNotes: Awaited<ReturnType<typeof prisma.dailyNote.findMany>>
}

interface ExportData {
    accounts: Awaited<ReturnType<typeof prisma.account.findMany>>
    tagGroups: Awaited<ReturnType<typeof prisma.tagGroup.findMany>>
    tags: Awaited<ReturnType<typeof prisma.tag.findMany>>
    trades: Awaited<ReturnType<typeof prisma.trade.findMany>>
    dayTags: Awaited<ReturnType<typeof prisma.dayTag.findMany>>
    configSymbols: Awaited<ReturnType<typeof prisma.configSymbol.findMany>>
    dailyNotes: Awaited<ReturnType<typeof prisma.dailyNote.findMany>>
}

/**
 * Creates a backup of the database and uploads directory
 * @returns Path to the created backup file
 */
export async function createBackup(): Promise<string> {
    try {
        // Ensure export directory exists
        await mkdir(EXPORT_DIR, { recursive: true })

        const exportId = randomUUID()
        const formattedDate = formatDateForFilename()
        const exportName = `backup-${formattedDate}-${exportId.slice(0, 8)}.zip`
        const exportPath = join(EXPORT_DIR, exportName)
        const tempDir = join(EXPORT_DIR, 'temp', exportId)

        // Create temp directory for export contents
        await mkdir(tempDir, { recursive: true })

        // Create manifest
        const manifest: ExportManifest = {
            id: exportId,
            createdAt: new Date().toISOString(),
            dataFile: 'database.db',
            uploads: [],
            metadata: {
                version: '1.0.0',
                totalFiles: 0,
                totalSize: 0,
                dataStats: {
                    accounts: 0,
                    tagGroups: 0,
                    tags: 0,
                    trades: 0,
                    dayTags: 0,
                    configSymbols: 0,
                    dailyNotes: 0
                }
            }
        }

        // Export all data from Prisma
        const exportData: ExportData = {
            accounts: await prisma.account.findMany({
                include: {
                    trades: true
                }
            }),
            tagGroups: await prisma.tagGroup.findMany({
                include: {
                    tags: true
                }
            }),
            tags: await prisma.tag.findMany({
                include: {
                    group: true,
                    tradeTags: true,
                    dayTags: true
                }
            }),
            trades: await prisma.trade.findMany({
                include: {
                    tags: true,
                    screenshots: true
                }
            }),
            dayTags: await prisma.dayTag.findMany({
                include: {
                    tags: true,
                    DayTagAssociation: true
                }
            }),
            configSymbols: await prisma.configSymbol.findMany(),
            dailyNotes: await prisma.dailyNote.findMany()
        }

        // Save the data to a JSON file
        const dataExportPath = join(tempDir, 'data.json')
        await writeFile(dataExportPath, JSON.stringify(exportData, null, 2))

        // Update manifest with data stats
        manifest.metadata.dataStats = {
            accounts: exportData.accounts.length,
            tagGroups: exportData.tagGroups.length,
            tags: exportData.tags.length,
            trades: exportData.trades.length,
            dayTags: exportData.dayTags.length,
            configSymbols: exportData.configSymbols.length,
            dailyNotes: exportData.dailyNotes.length
        }

        // Update manifest with the data file
        manifest.dataFile = 'data.json'
        const stats = await stat(dataExportPath)
        manifest.metadata.totalSize = stats.size
        manifest.metadata.totalFiles = 1 // data.json

        // Copy uploads if they exist
        if (existsSync(UPLOAD_DIR)) {
            const uploadsDest = join(tempDir, 'uploads')
            await mkdir(uploadsDest, { recursive: true })

            // Custom function to get files with full paths
            const getFiles = async (dir: string, parentPath = ''): Promise<Array<{ name: string, parentPath: string, isFile: () => boolean }>> => {
                const dirents = await readdir(dir, { withFileTypes: true });
                const files = [];
                for (const dirent of dirents) {
                    const res = join(dir, dirent.name);
                    if (dirent.isDirectory()) {
                        files.push(...(await getFiles(res, join(parentPath, dirent.name))));
                    } else {
                        files.push({
                            ...dirent,
                            parentPath,
                            isFile: () => true
                        });
                    }
                }
                return files;
            };

            const files = await getFiles(UPLOAD_DIR);

            for (const file of files) {
                if (file.isFile()) {
                    // Get the parent directory path
                    const parentPath = file.parentPath || ''
                    const source = join(UPLOAD_DIR, parentPath, file.name)
                    const relativePath = parentPath.replace(UPLOAD_DIR, '')
                    const destDir = join(uploadsDest, relativePath)

                    await mkdir(destDir, { recursive: true })
                    const dest = join(destDir, file.name)
                    await copyFile(source, dest)

                    const stats = await stat(source)
                    manifest.uploads.push(join(relativePath, file.name).replace(/^[\\/]/, ''))
                    manifest.metadata.totalFiles++
                    manifest.metadata.totalSize += stats.size
                }
            }
        }

        // Write manifest
        await writeFile(
            join(tempDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        )

        // Create zip archive
        await new Promise<void>((resolve, reject) => {
            const output = createWriteStream(exportPath)
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            })

            const cleanup = () => {
                output.off('close', resolve as () => void)
                output.off('error', onError)
                archive.off('error', onError)
            }

            const onError = (error: unknown) => {
                cleanup()
                reject(error instanceof Error ? error : new Error(String(error)))
            }

            output.once('close', () => {
                cleanup()
                resolve()
            })

            output.once('error', (err: Error) => onError(err))
            archive.once('error', (err: Error) => onError(err))

            archive.pipe(output)
            archive.directory(tempDir, false)
            archive.finalize()
        })

        // Cleanup temp directory
        await rm(tempDir, { recursive: true, force: true })

        return exportPath
    } catch (err: unknown) {
        throw createAppError({
            statusCode: 500,
            message: 'Backup creation failed',
            error: err instanceof Error ? err.message : 'Unknown error during backup creation'
        })
    }
}

/**
 * Restores from a backup file
 * @param backupPath Path to the backup zip file
 */
export async function restoreBackup(backupPath: string): Promise<void> {
    try {
        if (!existsSync(backupPath)) {
            throw new Error('Backup file not found')
        }

        const tempDir = join(EXPORT_DIR, 'restore', randomUUID())
        await mkdir(tempDir, { recursive: true })

        // Extract backup
        await extract(backupPath, { dir: tempDir })


        // Read manifest
        const manifestPath = join(tempDir, 'manifest.json')
        if (!existsSync(manifestPath)) {
            throw new Error('Invalid backup: manifest.json not found')
        }

        const manifest: ExportManifest = JSON.parse(
            await readFile(manifestPath, 'utf-8')
        )

        // Restore data from JSON file
        const dataSource = join(tempDir, manifest.dataFile)
        if (!existsSync(dataSource)) {
            throw new Error('Data file not found in backup')
        }

        const data: ImportData = JSON.parse(await readFile(dataSource, 'utf-8'))

        // Clear existing data (be careful with this in production!)
        await prisma.$transaction([
            prisma.tradeTagAssociation.deleteMany({}),
            prisma.dayTagAssociation.deleteMany({}),
            prisma.screenshot.deleteMany({}),
            prisma.trade.deleteMany({}),
            prisma.dayTag.deleteMany({}),
            prisma.tag.deleteMany({}),
            prisma.tagGroup.deleteMany({}),
            prisma.account.deleteMany({}),
            prisma.configSymbol.deleteMany({}),
            prisma.dailyNote.deleteMany({})
        ])

        // Restore data in the correct order to respect foreign key constraints
        await prisma.$transaction([
            // 1. TagGroups (no dependencies)
            ...data.tagGroups.map(group =>
                prisma.tagGroup.create({
                    data: {
                        id: group.id,
                        name: group.name,
                        createdAt: new Date(group.createdAt),
                        updatedAt: new Date(group.updatedAt)
                    }
                })
            ),

            // 2. Tags (depends on TagGroups)
            ...data.tags.map(tag =>
                prisma.tag.create({
                    data: {
                        id: tag.id,
                        name: tag.name,
                        description: tag.description,
                        color: tag.color,
                        dark_fg_reverse: tag.dark_fg_reverse,
                        groupId: tag.groupId,
                        createdAt: new Date(tag.createdAt),
                        updatedAt: new Date(tag.updatedAt)
                    }
                })
            ),

            // 3. Accounts (no dependencies)
            ...data.accounts.map(account =>
                prisma.account.create({
                    data: {
                        id: account.id,
                        name: account.name,
                        displayName: account.displayName,
                        fullname: account.fullname,
                        createdAt: new Date(account.createdAt)
                    }
                })
            ),

            // 4. Trades (depends on Accounts)
            ...data.trades.map(trade => {
                const tradeData = {
                    ...trade,
                    openDate: new Date(trade.openDate),
                    closeDate: new Date(trade.closeDate),
                    createdAt: new Date(trade.createdAt),
                    updatedAt: new Date(trade.updatedAt),
                    tags: {
                        create: trade.tags.map(tag => ({
                            tag: { connect: { id: tag.tagId } }
                        }))
                    },
                    screenshots: {
                        create: trade.screenshots.map(screenshot => ({
                            url: screenshot.url,
                            createdAt: new Date(screenshot.createdAt)
                        }))
                    }
                }
                return prisma.trade.create({ data: tradeData })
            }),

            // 5. ConfigSymbols (no dependencies)
            ...data.configSymbols.map(symbol =>
                prisma.configSymbol.create({
                    data: {
                        ...symbol,
                        createdAt: new Date(symbol.createdAt),
                        updatedAt: new Date(symbol.updatedAt)
                    }
                })
            ),

            // 6. DayTags and their associations
            ...data.dayTags.map(dayTag =>
                prisma.dayTag.create({
                    data: {
                        id: dayTag.id,
                        note: dayTag.note,
                        date: new Date(dayTag.date),
                        createdAt: new Date(dayTag.createdAt),
                        updatedAt: new Date(dayTag.updatedAt),
                        // Handle many-to-many relations
                        DayTagAssociation: {
                            create: dayTag.DayTagAssociation.map(assoc => ({
                                tag: { connect: { id: assoc.tagId } }
                            }))
                        }
                    }
                })
            ),

            ...data.dailyNotes.map(note =>
                prisma.dailyNote.create({
                    data: {
                        id: note.id,
                        content: note.content,
                        date: new Date(note.date),
                        createdAt: new Date(note.createdAt),
                        updatedAt: new Date(note.updatedAt)
                    }
                })
            )

        ])

        // Restore uploads
        const uploadsSource = join(tempDir, 'uploads')
        if (existsSync(uploadsSource)) {
            // Clear existing uploads
            if (existsSync(UPLOAD_DIR)) {
                await rm(UPLOAD_DIR, { recursive: true, force: true })
            }

            // Copy new uploads
            await mkdir(UPLOAD_DIR, { recursive: true })

            // Process the uploads directory recursively
            const processDirectory = async (dir: string, baseDir: string) => {
                const entries = await readdir(dir, { withFileTypes: true })

                for (const entry of entries) {
                    const fullPath = join(dir, entry.name)
                    const relativePath = dir.replace(uploadsSource, '')
                    const destPath = join(UPLOAD_DIR, relativePath, entry.name)

                    if (entry.isDirectory()) {
                        await mkdir(destPath, { recursive: true })
                        await processDirectory(fullPath, baseDir)
                    } else if (entry.isFile()) {
                        await mkdir(dirname(destPath), { recursive: true })
                        await copyFile(fullPath, destPath)
                    }
                }
            }

            await processDirectory(uploadsSource, uploadsSource)
        }

        // Cleanup
        console.log('Removing temp directory', tempDir)
        await rm(tempDir, { recursive: true, force: true })

    } catch (err) {
        throw createAppError({
            statusCode: 500,
            message: 'Restore failed',
            error: err instanceof Error ? err.message : 'Unknown error during restore'
        })
    }
}
