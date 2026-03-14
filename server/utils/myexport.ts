import { dirname, join } from 'node:path'
import { existsSync, createWriteStream } from 'node:fs'
import { mkdir, readdir, readFile, rm, stat, writeFile, copyFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import archiver from 'archiver'
import { formatDateForFilename } from '~/utils/date-utils'
import extract from 'extract-zip'
import { getDataDb, validateSchemaExists } from '../utils/db'
import { getUploadPath } from "./index"
import { createAppError } from './errors'
import type { InstrumentType } from '~/type'

const EXPORT_BASE_DIR = join(process.cwd(), 'temp/exports')

const versionToInt = (version: string): number => {
    const parts = version.split('.').map(p => parseInt(p, 10))
    return (parts[0] || 0) * 100 + (parts[1] || 0) * 10 + (parts[2] || 0)
}

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
    importProfiles?: Array<{
        id: number
        name: string
        provider: string
        importMode: string
        timezone: string
        keepExistingTrades: boolean
        instrumentType: InstrumentType
        ibkrFlexQueryToken: string | null
        ibkrFlexQueryId: string | null
        metadata: any | null
        createdAt: Date | string
        updatedAt: Date | string
        dayTags: Array<{ tagId: number }>
        tradeTags: Array<{ tagId: number }>
    }>
}

interface ExportData {
    accounts: Awaited<ReturnType<typeof prisma.account.findMany>>
    tagGroups: Awaited<ReturnType<typeof prisma.tagGroup.findMany>>
    tags: Awaited<ReturnType<typeof prisma.tag.findMany>>
    trades: Awaited<ReturnType<typeof prisma.trade.findMany>>
    dayTags: Awaited<ReturnType<typeof prisma.dayTag.findMany>>
    configSymbols: Awaited<ReturnType<typeof prisma.configSymbol.findMany>>
    dailyNotes: Awaited<ReturnType<typeof prisma.dailyNote.findMany>>
    importProfiles: Awaited<ReturnType<typeof prisma.importProfile.findMany>>
}

/**
 * Creates a backup of the database and uploads directory
 * @param userId - User ID
 * @param dbName - Database name to include in the backup filename
 * @returns Path to the created backup file
 */
export async function createBackup(userId: number, dbName: string): Promise<string> {
    try {
        // Get the correct Prisma client for this user's schema
        const prisma = await getDataDb(userId, dbName)

        const config = useRuntimeConfig()

        await validateSchemaExists(userId, dbName)

        // Create user-specific export directory: /temp/exports/user_{userId}/db_{dbName}
        const userExportDir = join(EXPORT_BASE_DIR, `user_${userId}`, `db_${dbName}`)
        await mkdir(userExportDir, { recursive: true })

        const exportId = randomUUID()
        const formattedDate = formatDateForFilename()
        const appVersion = config.public.appTagVersion
        const exportName = `backup-${dbName}-${appVersion}-${formattedDate}-${exportId.slice(0, 8)}.zip`
        const exportPath = join(userExportDir, exportName)
        const tempDir = join(userExportDir, 'temp', exportId)

        // Create temp directory for export contents
        await mkdir(tempDir, { recursive: true })

        // Create manifest
        const manifest: ExportManifest = {
            id: exportId,
            createdAt: new Date().toISOString(),
            dataFile: 'database.db',
            uploads: [],
            metadata: {
                version: '1.1.5',
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
            dailyNotes: await prisma.dailyNote.findMany(),
            importProfiles: await prisma.importProfile.findMany({
                include: {
                    dayTags: { select: { tagId: true } },
                    tradeTags: { select: { tagId: true } },
                }
            })
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

        // Get dynamic upload path for this user and database
        const uploadDir = join(process.cwd(), getUploadPath(userId, dbName))

        // Copy uploads if they exist
        if (existsSync(uploadDir)) {
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

            const files = await getFiles(uploadDir);

            for (const file of files) {
                if (file.isFile()) {
                    // Get the parent directory path
                    const parentPath = file.parentPath || ''
                    const source = join(uploadDir, parentPath, file.name)
                    const relativePath = parentPath.replace(uploadDir, '')
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
 * @param userId User ID for the database
 * @param dbName Database name
 */
export async function restoreBackup(backupPath: string, userId: number, dbName: string = 'default'): Promise<void> {
    try {
        if (!existsSync(backupPath)) {
            throw new Error('Backup file not found')
        }

        const tempDir = join(EXPORT_BASE_DIR, 'restore', randomUUID())
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

        const backupVersion = manifest.metadata?.version || '1.0.0'
        const backupVersionInt = versionToInt(backupVersion)

        console.log(`Restoring backup version ${backupVersion}`)

        const sanitizeName_1_0_0 = (name: string) =>
            backupVersionInt === 100 && !/^[\p{L}\p{N}_]+$/u.test(name)
                ? name.replace(/[^\p{L}\p{N}_]/gu, '_')
                : name

        // Restore data from JSON file
        const dataSource = join(tempDir, manifest.dataFile)
        if (!existsSync(dataSource)) {
            throw new Error('Data file not found in backup')
        }

        const data: ImportData = JSON.parse(await readFile(dataSource, 'utf-8'))

        // Get the correct database for this user
        const { getDataDb } = await import('./db')
        const dataDb = await getDataDb(userId, dbName)

        // Clear existing data (be careful with this in production!)
        await dataDb.$transaction([
            dataDb.tradeTagAssociation.deleteMany({}),
            dataDb.dayTagAssociation.deleteMany({}),
            dataDb.importProfileDayTag.deleteMany({}),
            dataDb.importProfileTradeTag.deleteMany({}),
            dataDb.screenshot.deleteMany({}),
            dataDb.trade.deleteMany({}),
            dataDb.dayTag.deleteMany({}),
            dataDb.tag.deleteMany({}),
            dataDb.tagGroup.deleteMany({}),
            dataDb.account.deleteMany({}),
            dataDb.configSymbol.deleteMany({}),
            dataDb.dailyNote.deleteMany({}),
            dataDb.importProfile.deleteMany({})
        ])

        // console.log(backupVersionInt)

        // Restore data in the correct order to respect foreign key constraints
        await dataDb.$transaction([
            // 1. TagGroups (no dependencies)
            ...data.tagGroups.map(group =>
                dataDb.tagGroup.create({
                    data: {
                        id: group.id,
                        name: sanitizeName_1_0_0(group.name),
                        createdAt: new Date(group.createdAt),
                        updatedAt: new Date(group.updatedAt)
                    }
                })
            ),

            // 2. Tags (depends on TagGroups)
            ...data.tags.map(tag =>
                dataDb.tag.create({
                    data: {
                        id: tag.id,
                        name: sanitizeName_1_0_0(tag.name),
                        description: tag.description,
                        color: tag.color,
                        dark_fg_reverse: tag.dark_fg_reverse ?? false,
                        groupId: tag.groupId,
                        createdAt: new Date(tag.createdAt),
                        updatedAt: new Date(tag.updatedAt)
                    }
                })
            ),

            // 3. Accounts (no dependencies)
            ...data.accounts.map(account =>
                dataDb.account.create({
                    data: {
                        id: account.id,
                        name: sanitizeName_1_0_0(account.name),
                        displayName: account.displayName || 'abcdef',
                        fullname: account.fullname,
                        aliases: account.aliases || '',
                        createdAt: new Date(account.createdAt),
                    }
                })
            ),


            // 4. Trades (depends on Accounts)
            ...data.trades.map(trade => {
                const tradeData = {
                    ...trade,
                    netProfit: backupVersionInt < 115 ? trade.profit - (trade.commission ?? 0) : trade.netProfit,
                    instrumentType: trade.instrumentType || 'any',
                    exchange: trade.exchange ?? 0,
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

                return dataDb.trade.create({ data: tradeData })
            }),

            // 5. ConfigSymbols (no dependencies)
            ...data.configSymbols.map(symbol =>
                dataDb.configSymbol.create({
                    data: {
                        id: symbol.id,
                        symbol: symbol.symbol,
                        digit: symbol.digit,
                        active: symbol.active,
                        notes: symbol.notes,
                        aliases: symbol.aliases || '',
                        pricePerPoint: symbol.pricePerPoint ?? -1,
                        createdAt: new Date(symbol.createdAt),
                        updatedAt: new Date(symbol.updatedAt)
                    }
                })
            ),

            // 6. DayTags and their associations
            ...data.dayTags.map(dayTag =>
                dataDb.dayTag.create({
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
                dataDb.dailyNote.create({
                    data: {
                        id: note.id,
                        content: note.content,
                        date: new Date(note.date),
                        createdAt: new Date(note.createdAt),
                        updatedAt: new Date(note.updatedAt)
                    }
                })
            ),

            // 8. ImportProfiles with tag relations (depends on Tags) — skip for 1.0.0 backups
            ...(backupVersion === '1.0.0' ? [] : (data.importProfiles || [])).map(profile =>
                dataDb.importProfile.create({
                    data: {
                        id: profile.id,
                        name: profile.name,
                        provider: profile.provider,
                        importMode: profile.importMode,
                        timezone: profile.timezone,
                        keepExistingTrades: profile.keepExistingTrades,
                        instrumentType: profile.instrumentType || "any",
                        ibkrFlexQueryToken: profile.ibkrFlexQueryToken,
                        ibkrFlexQueryId: profile.ibkrFlexQueryId,
                        metadata: profile.metadata || null,
                        createdAt: new Date(profile.createdAt),
                        updatedAt: new Date(profile.updatedAt),
                        dayTags: {
                            create: (profile.dayTags || []).map((t: { tagId: number }) => ({ tagId: t.tagId }))
                        },
                        tradeTags: {
                            create: (profile.tradeTags || []).map((t: { tagId: number }) => ({ tagId: t.tagId }))
                        },
                    }
                })
            )

        ])

        // Reset all auto-increment sequences to avoid unique constraint errors
        // after inserting records with explicit IDs
        const tables = ['TagGroup', 'Tag', 'Account', 'Trade', 'Screenshot', 'DayTag', 'DailyNote', 'ConfigSymbol', 'ImportProfile']
        for (const table of tables) {
            try {
                await dataDb.$executeRawUnsafe(
                    `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`
                )
            } catch (e) {
                // Some tables might not have a serial sequence, ignore
            }
        }

        // Get dynamic upload path for this user and database
        const uploadDir = join(process.cwd(), getUploadPath(userId, dbName))

        // Restore uploads
        const uploadsSource = join(tempDir, 'uploads')
        if (existsSync(uploadsSource)) {
            // Clear existing uploads
            if (existsSync(uploadDir)) {
                await rm(uploadDir, { recursive: true, force: true })
            }

            // Copy new uploads
            await mkdir(uploadDir, { recursive: true })

            // Process the uploads directory recursively
            const processDirectory = async (dir: string, baseDir: string) => {
                const entries = await readdir(dir, { withFileTypes: true })

                for (const entry of entries) {
                    const fullPath = join(dir, entry.name)
                    const relativePath = dir.replace(uploadsSource, '')
                    const destPath = join(uploadDir, relativePath, entry.name)

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
