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
                            '--import-name', importName
                        ]
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
