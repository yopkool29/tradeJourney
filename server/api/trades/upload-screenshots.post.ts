import { IncomingForm } from 'formidable'
import fs from 'fs'
import path from 'path'
import { prisma } from '../../utils/prisma'
import auth from '../../utils/auth'

export const config = {
    api: {
        bodyParser: false,
    },
}

const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1MB

const UPLOAD_DIR = path.resolve(process.cwd(), 'upload', 'screenshots')
if (!fs.existsSync(UPLOAD_DIR))
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })

export default defineEventHandler(async (event) => {
    await auth(event)
    const _userId = event.context.userId // Non utilisé directement car géré par le middleware d'authentification
    const form = new IncomingForm({ uploadDir: UPLOAD_DIR, keepExtensions: true, multiples: true })

    return new Promise((resolve, reject) => {
        form.parse(event.node.req, async (err, fields, files) => {
            if (err) return reject({ statusCode: 400, message: "Erreur lors de l'upload." })

            const tradeId = fields.tradeId?.[0]
            if (!tradeId) {
                return reject({ statusCode: 400, message: 'tradeId manquant.' })
            }

            // Vérifier que le trade existe
            const trade = await prisma.trade.findUnique({
                where: { id: parseInt(tradeId as string) }
            })

            if (!trade) {
                return reject({ statusCode: 404, message: 'Trade non trouvé' })
            }

            // Gérer les fichiers (peut être un seul ou plusieurs)
            let screenshots = files.screenshots
            if (!screenshots) {
                return reject({ statusCode: 400, message: 'Aucun fichier fourni.' })
            }

            // Traiter les fichiers et mettre à jour la base de données
            const screenshotUrls = []

            if (!Array.isArray(screenshots)) {
                screenshots = [screenshots]
            }

            // Plusieurs fichiers
            for (const file of screenshots) {
                if (file.size > MAX_FILE_SIZE) {
                    throw { statusCode: 400, statusMessage: 'Fichier trop volumineux' }
                }
                const filename = path.basename(file.newFilename || file.filepath)
                screenshotUrls.push(`${filename}`)
            }

            // Limiter à 3 screenshots maximum
            const limitedUrls = screenshotUrls.slice(0, 3)

            // Créer les screenshots dans la base de données
            for (const url of limitedUrls) {
                await prisma.screenshot.create({
                    data: {
                        url,
                        tradeId: trade.id
                    }
                })
            }

            // Récupérer le trade mis à jour avec ses screenshots
            const updatedTrade = await prisma.trade.findUnique({
                where: { id: trade.id },
                include: { screenshots: true }
            })

            resolve(updatedTrade)
        })
    })
})
