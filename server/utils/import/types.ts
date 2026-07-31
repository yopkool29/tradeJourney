import type { ImportMode } from '~/utils/date-utils'
import type { InstrumentType } from '~/type'
import type { H3Event, EventHandlerRequest } from 'h3'
import type { AccountTradesWithImportName } from '../standard-csv-parser'

// Contexte passé aux providers pour parser un fichier
export interface ParseContext {
	timezone: string
	importMode: ImportMode
	accountTimezones: Map<string, { timezone: string; importMode: ImportMode }>
}

// Interface commune pour tous les providers d'import
export interface ImportProvider {
	// Clé du reportType (correspond au champ reportType du FormData)
	reportType: string

	// Nom d'import par défaut (peut être surchargé par AccountTradesWithImportName.importName)
	defaultImportName: string

	// Defaults pour updateSymbols
	symbolPricePerPoint: number
	symbolDigit: number

	// Indique si le provider supporte plusieurs comptes
	multiAccount: boolean

	// Parse le contenu du fichier et retourne les trades groupés par compte
	// filePath: chemin du fichier temporaire uploadé
	parse(filePath: string, ctx: ParseContext): AccountTradesWithImportName[] | null
}

// Contexte pour le traitement des trades (transmis au service)
export interface ProcessTradesContext {
	event: H3Event<EventHandlerRequest>
	keepExistingTrades: boolean
	dayTagIds: number[]
	tradeTagIds: number[]
	instrumentType: InstrumentType
}
