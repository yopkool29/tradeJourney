import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { mkdir, readdir, copyFile, rm } from 'node:fs/promises'

// Utilitaires de migration des URLs de screenshots
// Convertit tous les formats legacy vers screenshots/filename.png
//
// Formats legacy couverts :
//   1. filename.png (filename-only)
//   2. user_X_data/db/screenshots/filename.png (path complet avec screenshots/)
//   3. user_X_data/db/filename.png (très ancien, sans screenshots/)

export const migrateImageUrlsInContent = (content: string | null): string | null => {
    if (!content) return content
    // Cas 2 : path complet avec /screenshots/ → screenshots/filename
    let result = content.replace(/\/api\/image\?path=user_\d+_data\/[^/]+\/screenshots\/([^)\s"&]+)/g, '/api/image?path=screenshots/$1')
    // Cas 3 : path complet sans /screenshots/ (très ancien format)
    result = result.replace(/\/api\/image\?path=user_\d+_data\/[^/]+\/([^/)\s"&]+)/g, '/api/image?path=screenshots/$1')
    // Cas 1 : filename-only (pas de slash dans le path) → screenshots/filename
    result = result.replace(/\/api\/image\?path=(?!screenshots\/)([^/)\s"&]+)/g, '/api/image?path=screenshots/$1')
    return result
}

export const migrateScreenshotUrl = (url: string): string => {
    // Cas 2 : path complet avec /screenshots/
    const match2 = url.match(/^user_\d+_data\/[^/]+\/screenshots\/(.+)$/)
    if (match2) return `screenshots/${match2[1]}`
    // Cas 3 : path complet sans /screenshots/
    const match3 = url.match(/^user_\d+_data\/[^/]+\/(.+)$/)
    if (match3) return `screenshots/${match3[1]}`
    // Cas 1 : filename-only
    if (!url.startsWith('screenshots/')) return `screenshots/${url}`
    return url
}

export const migrateScreenshotsDir = async (uploadDir: string): Promise<void> => {
    const screenshotsDir = join(uploadDir, 'screenshots')
    await mkdir(screenshotsDir, { recursive: true })

    if (!existsSync(uploadDir)) return

    const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])
    const rootEntries = await readdir(uploadDir, { withFileTypes: true })
    for (const entry of rootEntries) {
        if (!entry.isFile()) continue
        const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase()
        if (!imageExtensions.has(ext)) continue
        const src = join(uploadDir, entry.name)
        const dest = join(screenshotsDir, entry.name)
        await copyFile(src, dest)
        await rm(src)
    }
}
