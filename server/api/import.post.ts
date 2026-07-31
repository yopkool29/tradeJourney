import type { H3Event, EventHandlerRequest } from 'h3'
import { IncomingForm } from 'formidable'
import { isTimezoneInput, InstrumentType } from '~/type'
import { existsSync } from 'fs'
import type { ImportMode } from '~/utils/date-utils'
import { createAppError } from '../utils/errors'
import { getImportProvider } from '../utils/import/registry'
import { processTrades, updateSymbols } from '../utils/import/importService'
import type { ParseContext } from '../utils/import/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const config = {
	api: {
		bodyParser: false,
	},
}

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>) => {
	await auth(event)
	const form = new IncomingForm()

	return new Promise((resolve, reject) => {
		if (!event.context.dbName) {
			return reject({
				statusCode: 400,
				message: 'No database selected. Please select a database first.'
			})
		}
		form.parse(event.node.req, async (err, fields, files) => {
			if (err)
				return reject({ statusCode: 400, message: 'Error during upload.' })

			try {
				const reportType = fields.reportType![0]
				const importMode = fields.importMode![0] as ImportMode
				const timezone = fields.timezone?.[0]

				if (!timezone || !isTimezoneInput(timezone)) {
					throw { statusCode: 400, message: `Invalid or missing timezone format: ${timezone}` }
				}
				const keepExistingTrades = fields.keepExistingTrades![0] === 'true'
				const instrumentTypeRaw = fields.instrumentType?.[0] || 'Any'
				const instrumentType = (instrumentTypeRaw.toLowerCase() as InstrumentType) || InstrumentType.Any

				const dayTagIdsStr = fields.dayTagIds?.[0]
				const tradeTagIdsStr = fields.tradeTagIds?.[0]
				const dayTagIds = dayTagIdsStr ? JSON.parse(dayTagIdsStr) : []
				const tradeTagIds = tradeTagIdsStr ? JSON.parse(tradeTagIdsStr) : []

				const fileList = Object.values(files)[0]
				const realFile = Array.isArray(fileList) ? fileList[0] : fileList

				if (!realFile?.filepath)
					throw { statusCode: 400, message: 'Missing file.' }

				if (!existsSync(realFile.filepath)) {
					throw { statusCode: 400, message: 'Temporary file not found.' }
				}

				if (realFile.size > MAX_FILE_SIZE) {
					throw { statusCode: 400, statusMessage: 'File too large' }
				}

				// Récupérer le provider correspondant au reportType
				const provider = getImportProvider(reportType)
				if (!provider) {
					throw { statusCode: 400, message: `Unsupported report type: ${reportType}` }
				}

				const parseContext: ParseContext = {
					timezone,
					importMode,
					accountTimezones: new Map<string, { timezone: string; importMode: ImportMode }>(),
				}

				// Parser le fichier avec le provider
				const accountsTrades = provider.parse(realFile.filepath, parseContext)

				if (!accountsTrades || accountsTrades.length === 0) {
					throw { statusCode: 400, message: `Invalid ${provider.defaultImportName} file format. Could not find account information.` }
				}

				let countUpdated = 0
				let countDiscard = 0

				// Traiter chaque compte
				for (const accountTrades of accountsTrades) {
					try {
						// Utiliser l'importName du trade si défini (format standard), sinon celui du provider
						const importName = accountTrades.importName || provider.defaultImportName

						const result = await processTrades(
							event,
							importName,
							accountTrades,
							keepExistingTrades,
							dayTagIds,
							tradeTagIds,
							instrumentType
						)
						countUpdated += result.countUpdated
						countDiscard += result.countDiscard

						await updateSymbols(event, accountTrades.trades, provider.symbolPricePerPoint, provider.symbolDigit)
					} catch (error) {
						console.error(`Error processing account ${accountTrades.accountInfo.name}:`, error)
						countDiscard += accountTrades.trades.length
					}
				}

				resolve({
					success: true,
					message: `Import successful - ${countUpdated} trades updated, ${countDiscard} ignored`,
					countUpdated,
					countDiscard
				})

			} catch (err) {
				reject(createAppError({
					statusCode: 500,
					message: 'Error during import processing',
					tag: 'api.import.processing_error',
					error: err
				}))
			}
		})
	})
})
