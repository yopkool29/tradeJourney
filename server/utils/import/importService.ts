import type { H3Event, EventHandlerRequest } from 'h3'
import type { PrismaClient as DataPrismaClient } from '~/generated/prisma-data'
import { getDataDb } from '../db'
import { symbolPricePerPoint } from '~/utils'
import { toUTCMidnight } from '~/utils/date-utils'
import { generateUniqueId, CreateTradeSchema } from '~/schema/trade'
import type { InstrumentType } from '~/type'
import type { AccountTrades } from '../index'
import { getAliasList, matchesAlias } from '../symbolResolver'

// Upsert les DayTags pour les jours importés
const upsertDayTagsForImport = async (
	dataDb: DataPrismaClient,
	tradingDays: string[],
	tagIds: number[]
) => {
	if (tagIds.length === 0) return

	for (const day of tradingDays) {
		const dayDate = toUTCMidnight(day)
		const existingDayTag = await dataDb.dayTag.findFirst({ where: { date: dayDate } })

		if (existingDayTag) {
			await dataDb.dayTagAssociation.deleteMany({ where: { dayTagId: existingDayTag.id } })
			await dataDb.dayTagAssociation.createMany({
				data: tagIds.map(tagId => ({ dayTagId: existingDayTag.id, tagId }))
			})
		} else {
			await dataDb.dayTag.create({
				data: {
					date: dayDate,
					note: '',
					DayTagAssociation: {
						create: tagIds.map(tagId => ({ tag: { connect: { id: tagId } } }))
					}
				}
			})
		}
	}
}

// Trouver un symbole par nom ou alias (avec wildcard)
const findSymbolByNameOrAlias = async (dataDb: DataPrismaClient, symbolName: string) => {
	const normalizedSymbol = symbolName.toUpperCase()

	let existingSymbol = await dataDb.configSymbol.findUnique({
		where: { symbol: normalizedSymbol }
	})

	if (!existingSymbol) {
		const allSymbols = await dataDb.configSymbol.findMany()
		existingSymbol = allSymbols.find(sym => matchesAlias(symbolName, getAliasList(sym))) || null
	}

	return existingSymbol
}

export interface ProcessTradesResult {
	countUpdated: number
	countDiscard: number
}

// Traite les trades d'un compte : création/maj des trades, tags, dayTags
export const processTrades = async (
	event: H3Event<EventHandlerRequest>,
	importName: string,
	parsedTrades: AccountTrades,
	keepExistingTrades: boolean,
	dayTagIds: number[],
	tradeTagIds: number[],
	instrumentType: InstrumentType
): Promise<ProcessTradesResult> => {
	let countUpdated = 0
	let countDiscard = 0

	if (!parsedTrades) {
		throw { statusCode: 400, message: 'Invalid file.' }
	}

	const userId = Number(event.context.userId)
	const dbName = event.context.dbName
	const dataDb = await getDataDb(userId, dbName)

	// Gérer le compte
	let account = await dataDb.account.findUnique({
		where: { name: parsedTrades.accountInfo.name }
	})

	// Recherche par alias
	if (!account) {
		const allAccounts = await dataDb.account.findMany()
		account = allAccounts.find(acc => {
			return matchesAlias(parsedTrades.accountInfo.name, getAliasList(acc))
		}) || null
	}

	if (!account) {
		account = await dataDb.account.create({
			data: {
				name: parsedTrades.accountInfo.name,
				displayName: parsedTrades.accountInfo.name,
				fullname: parsedTrades.accountInfo.fullname
			}
		})
	}

	if (!keepExistingTrades) {
		for (const day of parsedTrades.accountInfo.tradingDays) {
			const startOfDay = new Date(day)
			const endOfDay = new Date(day)
			endOfDay.setDate(endOfDay.getDate() + 1)

			await dataDb.trade.deleteMany({
				where: {
					accountId: account.id,
					closeDate: { gte: startOfDay, lt: endOfDay },
					importName
				}
			})
		}
	}

	const accountId = account.id

	for (const trade of parsedTrades.trades) {
		try {
			const symbolConfig = await findSymbolByNameOrAlias(dataDb, trade.symbol)
			const normalizedSymbol = symbolConfig ? symbolConfig.symbol : trade.symbol.toUpperCase()

			const tradeWithAccount = { ...trade, symbol: normalizedSymbol, accountId }
			const parsedTrade = CreateTradeSchema.parse(tradeWithAccount) as Record<string, unknown>
			const uniqueId = generateUniqueId(importName, accountId, parsedTrade.symbol as string, parsedTrade.openDate as Date, parsedTrade.closeDate as Date, trade.extendId)

			const { ...tradeDataForPrisma } = parsedTrade

			const existingTrade = await dataDb.trade.findUnique({ where: { uniqueId } })
			if (!existingTrade) {
				const createdTrade = await dataDb.trade.create({
					data: {
						...tradeDataForPrisma,
						uniqueId,
						importName,
						active: true,
						instrumentType: trade.instrumentType || instrumentType,
						screenshots: { create: [] }
					}
				})

				if (tradeTagIds.length > 0) {
					await dataDb.tradeTagAssociation.createMany({
						data: tradeTagIds.map(tagId => ({ tradeId: createdTrade.id, tagId })),
						skipDuplicates: true
					})
				}

				countUpdated++
			} else {
				if (!keepExistingTrades) {
					await dataDb.tradeTagAssociation.deleteMany({ where: { tradeId: existingTrade.id } })

					if (tradeTagIds.length > 0) {
						await dataDb.tradeTagAssociation.createMany({
							data: tradeTagIds.map(tagId => ({ tradeId: existingTrade.id, tagId })),
							skipDuplicates: true
						})
					}
				}
				countDiscard++
			}
		} catch (error) {
			console.error(`Trade rejected: ${trade.symbol} ${trade.type} ${trade.lot}`)
			console.error('  Error:', error)
			countDiscard++
		}
	}

	await upsertDayTagsForImport(dataDb, parsedTrades.accountInfo.tradingDays, dayTagIds)

	return { countUpdated, countDiscard }
}

// Met à jour les symboles manquants dans la base
export const updateSymbols = async (
	event: H3Event<EventHandlerRequest>,
	trades: { symbol: string }[],
	pricePerPointDefault: number,
	defaultDigit: number
) => {
	const symbols = new Set(trades.map(t => t.symbol.toUpperCase()))
	const userId = Number(event.context.userId)
	const dbName = event.context.dbName
	const dataDb = await getDataDb(userId, dbName)

	for (const symbol of symbols) {
		try {
			const existingSymbol = await findSymbolByNameOrAlias(dataDb, symbol)

			if (!existingSymbol) {
				const pricePerPoint = symbolPricePerPoint[symbol as keyof typeof symbolPricePerPoint] || pricePerPointDefault

				await dataDb.configSymbol.create({
					data: {
						symbol,
						digit: defaultDigit,
						active: true,
						pricePerPoint,
						notes: `Symbole ajouté, pricePerPoint=${pricePerPoint}$`
					}
				})
			}
		} catch (error) {
			console.error(`Error updating symbol ${symbol}:`, error)
		}
	}
}
