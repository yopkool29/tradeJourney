import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'
import { parseMT5Xls, type MT5XlsRawRow } from '../mt5-parser'
import { parseNTExecutions } from '../nt-parser'
import { parseQuantowerExecutions } from '../quantower-parser'
import { parseIBKRTrades } from '../ibkr-parser'
import { parseStandardCSV } from '../standard-csv-parser'
import type { ImportProvider } from './types'
import type { AccountTradesWithImportName } from '../standard-csv-parser'

// Provider MT5 — format XLS, un seul compte
const mt5Provider: ImportProvider = {
	reportType: 'mt5',
	defaultImportName: 'MT5',
	symbolPricePerPoint: -1,
	symbolDigit: 4,
	multiAccount: false,
	parse(filePath, ctx) {
		const rawData = readFileSync(filePath)
		const workbook = XLSX.read(rawData)
		const sheetName = workbook.SheetNames[0]
		const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as MT5XlsRawRow[]
		const result = parseMT5Xls(rows, ctx.timezone, ctx.importMode, ctx.accountTimezones)
		return result ? [result] : null
	},
}

// Provider NT8 — format CSV, multi-comptes
const nt8Provider: ImportProvider = {
	reportType: 'nt8',
	defaultImportName: 'NT8',
	symbolPricePerPoint: 10,
	symbolDigit: 2,
	multiAccount: true,
	parse(filePath, ctx) {
		const csvContent = readFileSync(filePath, 'utf-8')
		return parseNTExecutions(csvContent, ctx.timezone, ctx.importMode, ctx.accountTimezones)
	},
}

// Provider Quantower — format CSV, multi-comptes
const quantowerProvider: ImportProvider = {
	reportType: 'quantower',
	defaultImportName: 'Quantower',
	symbolPricePerPoint: 5,
	symbolDigit: 2,
	multiAccount: true,
	parse(filePath, ctx) {
		const csvContent = readFileSync(filePath, 'utf-8')
		return parseQuantowerExecutions(csvContent, ctx.timezone, ctx.importMode, ctx.accountTimezones)
	},
}

// Provider IBKR — format CSV (Flex Query), multi-comptes
const ibkrProvider: ImportProvider = {
	reportType: 'ibkr',
	defaultImportName: 'IBKR',
	symbolPricePerPoint: 1,
	symbolDigit: 3,
	multiAccount: true,
	parse(filePath, ctx) {
		const csvContent = readFileSync(filePath, 'utf-8')
		return parseIBKRTrades(csvContent, ctx.timezone, ctx.importMode, ctx.accountTimezones)
	},
}

// Provider Standard — format CSV PnlTracker, multi-comptes, importName dynamique
const standardProvider: ImportProvider = {
	reportType: 'standard',
	defaultImportName: 'Standard',
	symbolPricePerPoint: 1,
	symbolDigit: 3,
	multiAccount: true,
	parse(filePath, ctx) {
		const csvBuffer = readFileSync(filePath)
		// Détecter l'encodage UTF-16LE (BOM avec null bytes)
		const csvContent = csvBuffer.includes(0x00)
			? new TextDecoder('utf-16le').decode(csvBuffer)
			: csvBuffer.toString('utf-8')
		return parseStandardCSV(csvContent, ctx.timezone, ctx.importMode, ctx.accountTimezones)
	},
}

// Registry : map reportType → provider
const providers: Record<string, ImportProvider> = {
	mt5: mt5Provider,
	nt8: nt8Provider,
	quantower: quantowerProvider,
	ibkr: ibkrProvider,
	standard: standardProvider,
}

export const getImportProvider = (reportType: string): ImportProvider | null => {
	return providers[reportType] || null
}
