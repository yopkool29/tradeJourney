import { IncomingForm } from 'formidable'
import { readFile, unlink } from 'fs/promises'
import { execa } from 'execa'
import { join } from 'path'
import auth from '~/server/utils/auth'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default defineEventHandler(async (event) => {
    // Authenticate user
    await auth(event)

    // Get userId from context
    const userId = Number(event.context.userId)

    const form = new IncomingForm({
        maxFileSize: MAX_FILE_SIZE,
        keepExtensions: true,
    })

    return new Promise((resolve, reject) => {
        form.parse(event.node.req, async (err, fields, files) => {
            if (err) {
                reject(createError({
                    statusCode: 400,
                    message: 'Error parsing form data',
                }))
                return
            }

            try {
                // Extract conversion type and file
                const conversionType = Array.isArray(fields.conversionType)
                    ? fields.conversionType[0]
                    : fields.conversionType

                const accountName = Array.isArray(fields.accountName)
                    ? fields.accountName[0]
                    : fields.accountName

                const accountFullname = Array.isArray(fields.accountFullname)
                    ? fields.accountFullname[0]
                    : fields.accountFullname

                const importName = Array.isArray(fields.importName)
                    ? fields.importName[0]
                    : fields.importName

                const symbol = Array.isArray(fields.symbol)
                    ? fields.symbol[0]
                    : fields.symbol

                const commissionPercent = Array.isArray(fields.commissionPercent)
                    ? fields.commissionPercent[0]
                    : fields.commissionPercent

                const stopLossPoints = Array.isArray(fields.stopLossPoints)
                    ? fields.stopLossPoints[0]
                    : fields.stopLossPoints

                const autoEstimate = Array.isArray(fields.autoEstimate)
                    ? fields.autoEstimate[0]
                    : fields.autoEstimate

                const estimateOnly = Array.isArray(fields.estimateOnly)
                    ? fields.estimateOnly[0]
                    : fields.estimateOnly

                const fileList = Object.values(files)[0]
                const file = Array.isArray(fileList) ? fileList[0] : fileList

                if (!file) {
                    throw createError({
                        statusCode: 400,
                        message: 'No file provided',
                    })
                }

                if (!conversionType) {
                    throw createError({
                        statusCode: 400,
                        message: 'No conversion type provided',
                    })
                }

                // Mode estimation uniquement (bouton "Auto-estimate" du plugin TradingView)
                // Court-circuite la conversion : appelle le script Python avec --estimate-only
                // et retourne le résultat en JSON au lieu d'un fichier CSV.
                if (estimateOnly === 'true' && conversionType === 'tradingview') {
                    const scriptPath = join(process.cwd(), 'pnltracker-tools/python', 'tradingview_to_standard-csv.py')
                    try {
                        const result = await execa('uv', ['run', 'python', scriptPath, file.filepath, '/tmp/dummy.csv', '--estimate-only'], {
                            cwd: join(process.cwd(), 'pnltracker-tools/python'),
                        })
                        // Le script affiche le JSON sur stdout (les logs vont sur stderr)
                        const jsonLine = result.stdout.split('\n').find(l => l.trim().startsWith('{'))
                        if (!jsonLine) {
                            throw createError({ statusCode: 500, message: 'No JSON output from estimation script' })
                        }
                        const parsed = JSON.parse(jsonLine)
                        // Nettoyer le fichier temporaire
                        try { await unlink(file.filepath) } catch { // ignore
                        }
                        resolve(parsed)
                    } catch (execError: unknown) {
                        try { await unlink(file.filepath) } catch { // ignore
                        }
                        const execErr = execError as { stderr?: string; message?: string }
                        throw createError({
                            statusCode: 500,
                            message: `Estimation failed: ${execErr.stderr || execErr.message}`,
                        })
                    }
                    return
                }

                if (!accountName || !accountFullname || !importName) {
                    throw createError({
                        statusCode: 400,
                        message: 'Missing converter parameters (accountName, accountFullname, or importName)',
                    })
                }

                // Create unique output file path with userId to avoid conflicts
                const outputPath = `/tmp/${userId}-output.csv`

                // Determine which Python script to use
                let scriptName: string
                let scriptArgs: string[] = []

                switch (conversionType) {
                    case 'schwab-options':
                        scriptName = 'schwab_options_to_standard-csv.py'
                        scriptArgs = [
                            file.filepath,
                            outputPath,
                            '--account-name', accountName,
                            '--account-fullname', accountFullname,
                            '--import-name', importName
                        ]
                        break
                    case 'tradingview':
                        scriptName = 'tradingview_to_standard-csv.py'
                        scriptArgs = [
                            file.filepath,
                            outputPath,
                            '--account-name', accountName,
                            '--account-fullname', accountFullname,
                            '--import-name', importName,
                            '--symbol', symbol || 'MYM',
                            '--commission-percent', commissionPercent || '0',
                        ]
                        // Stop loss en points depuis l'entry (active le R-multiple fiable)
                        if (stopLossPoints) {
                            scriptArgs.push('--stop-loss-points', stopLossPoints)
                        }
                        // Auto-estimate du SL depuis les trades perdants à la conversion
                        if (autoEstimate === 'true') {
                            scriptArgs.push('--auto-estimate-stop-loss')
                        }
                        break
                    default:
                        throw createError({
                            statusCode: 400,
                            message: `Unknown conversion type: ${conversionType}`,
                        })
                }

                const scriptPath = join(process.cwd(), 'pnltracker-tools/python', scriptName)

                // Execute Python script with uv
                try {
                    await execa('uv', ['run', 'python', scriptPath, ...scriptArgs], {
                        cwd: join(process.cwd(), 'pnltracker-tools/python'),
                    })
                } catch (execError: unknown) {
                    console.error('Python script execution error:', execError)
                    const execErr = execError as { stderr?: string; message?: string }
                    throw createError({
                        statusCode: 500,
                        message: `Conversion failed: ${execErr.stderr || execErr.message}`,
                    })
                }

                // Read the converted file
                const convertedData = await readFile(outputPath, 'utf-8')

                // Clean up temporary files
                try {
                    await unlink(file.filepath)
                    await unlink(outputPath)
                } catch (cleanupError) {
                    console.error('Cleanup error:', cleanupError)
                }

                // Return the converted CSV
                setResponseHeader(event, 'Content-Type', 'text/csv')
                setResponseHeader(event, 'Content-Disposition', `attachment; filename="${file.originalFilename?.replace(/\.[^/.]+$/, '')}_converted.csv"`)

                resolve(convertedData)
            } catch (error: unknown) {
                // Clean up uploaded file on error
                if (files) {
                    const fileList = Object.values(files)[0]
                    const file = Array.isArray(fileList) ? fileList[0] : fileList
                    if (file) {
                        try {
                            await unlink(file.filepath)
                        } catch (cleanupError) {
                            console.error('Cleanup error:', cleanupError)
                        }
                    }
                }

                reject(error)
            }
        })
    })
})
