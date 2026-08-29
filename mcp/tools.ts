import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TradeFilter } from '~/schema/tradeFilter'
import { z } from 'zod'
import { PnlTrackerApiError, type PnlTrackerApiClient } from './apiClient'
import {
	AnalyticsBreakdownResponseSchema,
	AnalyticsInputSchema,
	AnalyticsSummaryResponseSchema,
	AppendAiJournalInputSchema,
	BreakdownInputSchema,
	ClearAiJournalInputSchema,
	DatabaseInputSchema,
	GetNoteImageInputSchema,
	GetTradeInputSchema,
	ListDailyNotesInputSchema,
	NoteMetadataSchema,
	PnlTimeseriesResponseSchema,
	SearchTradesInputSchema,
	SetAiJournalEnabledInputSchema,
	TimeseriesInputSchema,
	TradeMetadataSchema,
	type PnlMode,
	type TradeFilters,
} from './schemas'

type JsonRecord = Record<string, unknown>

const toolAnnotations = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: true,
}

const stateToolAnnotations = {
	readOnlyHint: false,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false,
}

const appendToolAnnotations = {
	readOnlyHint: false,
	destructiveHint: false,
	idempotentHint: false,
	openWorldHint: true,
}

const asRecord = (value: unknown): JsonRecord => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : []
const readString = (record: JsonRecord, key: string): string | null => typeof record[key] === 'string' ? record[key] : null
const readNumber = (record: JsonRecord, key: string): number | null => typeof record[key] === 'number' && Number.isFinite(record[key]) ? record[key] : null
const readBoolean = (record: JsonRecord, key: string): boolean => record[key] === true

const mapTag = (value: unknown) => {
	const tag = asRecord(value)
	return {
		id: readNumber(tag, 'id'),
		name: readString(tag, 'name'),
		description: readString(tag, 'description'),
		color: readString(tag, 'color'),
		group_id: readNumber(tag, 'groupId'),
	}
}

const parseMetadata = (value: unknown): unknown => {
	if (typeof value !== 'string') return value
	try {
		return JSON.parse(value) as unknown
	} catch {
		return null
	}
}

const mapDailyNote = (value: unknown) => {
	const note = asRecord(value)
	const metadata = NoteMetadataSchema.safeParse(parseMetadata(note.metadata))
	const content = readString(note, 'content') || ''
	return {
		id: readNumber(note, 'id'),
		date: readString(note, 'date'),
		updated_at: readString(note, 'updatedAt'),
		subtitle: metadata.success ? metadata.data.subtitle?.slice(0, 500) || '' : '',
		content: content.slice(0, 50000),
		content_truncated: content.length > 50000,
	}
}

const mapTradeMetadata = (value: unknown, includeDetailedNote: boolean) => {
	const parsed = TradeMetadataSchema.safeParse(parseMetadata(value))
	if (!parsed.success) return { risk_reward: null, option_details: null }
	const metadata = parsed.data
	const hasOptionDetails = metadata.spreadType !== undefined || metadata.posEffect !== undefined || metadata.orderType !== undefined || metadata.legs !== undefined
	const result: JsonRecord = {
		risk_reward: metadata.riskReward ?? null,
		option_details: hasOptionDetails ? {
			spread_type: metadata.spreadType?.slice(0, 200) || null,
			position_effect: metadata.posEffect?.slice(0, 200) || null,
			order_type: metadata.orderType?.slice(0, 200) || null,
			legs: (metadata.legs || []).slice(0, 50).map(leg => ({
				strike: leg.strike ?? null,
				type: leg.type?.slice(0, 50) || null,
				quantity: leg.qty ?? null,
				price: leg.price ?? null,
				expiration: leg.expiration?.slice(0, 100) || null,
			})),
		} : null,
	}
	if (includeDetailedNote) {
		const detailedNote = metadata.detailedNote || ''
		result.detailed_note = detailedNote.slice(0, 20000)
		result.detailed_note_truncated = detailedNote.length > 20000
	}
	return result
}

const mapTrade = (value: unknown, includeDetailedNote: boolean) => {
	const trade = asRecord(value)
	return {
		id: readNumber(trade, 'id'),
		open_date: readString(trade, 'openDate'),
		close_date: readString(trade, 'closeDate'),
		symbol: readString(trade, 'symbol'),
		side: readString(trade, 'type'),
		instrument_type: readString(trade, 'instrumentType'),
		lot: readNumber(trade, 'lot'),
		open_price: readNumber(trade, 'openPrice'),
		close_price: readNumber(trade, 'closePrice'),
		stop_loss: readNumber(trade, 'stopLoss'),
		take_profit: readNumber(trade, 'takeProfit'),
		gross_profit: readNumber(trade, 'profit'),
		net_profit: readNumber(trade, 'netProfit'),
		profit_points: readNumber(trade, 'profit_points'),
		commission: readNumber(trade, 'commission'),
		exchange: readNumber(trade, 'exchange'),
		mae: readNumber(trade, 'mae'),
		mfe: readNumber(trade, 'mfe'),
		account_id: readNumber(trade, 'accountId'),
		account_name: readString(trade, 'account_displayName'),
		import_name: readString(trade, 'importName'),
		tags: asArray(trade.tags).map(mapTag),
		...mapTradeMetadata(trade.metadata, includeDetailedNote),
	}
}

const toApiFilters = (filters: TradeFilters, pnlMode: PnlMode): TradeFilter[] => {
	const result: TradeFilter[] = []
	if (filters.date_from) result.push({ column: filters.date_field, operator: '>=', value: filters.date_from })
	if (filters.date_to) result.push({ column: filters.date_field, operator: '<=', value: filters.date_to })
	if (filters.symbols?.length) result.push({ column: 'symbol', operator: 'in', value: filters.symbols })
	if (filters.account_ids?.length) result.push({ column: 'accountId', operator: 'in', value: filters.account_ids })
	if (filters.tag_ids?.length) result.push({ column: 'tags', operator: 'in', value: filters.tag_ids.join(',') })
	if (filters.sides?.length) result.push({ column: 'type', operator: 'in', value: filters.sides })
	if (filters.instrument_types?.length) result.push({ column: 'instrumentType', operator: 'in', value: filters.instrument_types })
	const pnlColumn = pnlMode === 'net' ? 'netProfit' : 'profit'
	if (filters.pnl_min !== undefined) result.push({ column: pnlColumn, operator: '>=', value: filters.pnl_min })
	if (filters.pnl_max !== undefined) result.push({ column: pnlColumn, operator: '<=', value: filters.pnl_max })
	return result
}

const createToolResult = (result: unknown) => ({
	content: [{ type: 'text' as const, text: JSON.stringify(result) }],
	structuredContent: { result },
})

const createToolError = (error: unknown) => {
	const message = error instanceof PnlTrackerApiError || error instanceof z.ZodError
		? error.message
		: 'Unexpected PnlTracker MCP error'
	return {
		content: [{ type: 'text' as const, text: message }],
		isError: true,
	}
}

const withErrorBoundary = async (callback: () => Promise<unknown>) => {
	try {
		return createToolResult(await callback())
	} catch (error) {
		return createToolError(error)
	}
}

export const registerTools = (server: McpServer, api: PnlTrackerApiClient) => {
	let aiJournalEnabled = true

	server.registerTool('get_ai_journal_status', {
		description: 'Check if AI analysis journaling is enabled. Call this first if you are unsure whether to append results to the journal. Returns { enabled: boolean }. Enabled by default after every MCP restart.',
		inputSchema: z.object({}).strict(),
		annotations: toolAnnotations,
	}, async () => withErrorBoundary(async () => ({ enabled: aiJournalEnabled })))

	server.registerTool('set_ai_journal_enabled', {
		description: 'Enable or disable AI analysis journaling for this MCP process. When disabled, append_ai_journal will refuse to save. Resets to enabled on MCP restart. Use this when the user asks to stop or resume automatic journaling.',
		inputSchema: SetAiJournalEnabledInputSchema,
		annotations: stateToolAnnotations,
	}, async ({ enabled }) => withErrorBoundary(async () => {
		aiJournalEnabled = enabled
		return { enabled: aiJournalEnabled }
	}))

	server.registerTool('append_ai_journal', {
		description: 'Append a trading analysis as Markdown to the reserved AI journal note in a specific database. Call this AFTER you have queried trades or metrics and produced a user-requested analysis (counts, summaries, comparisons, performance reviews). Do NOT call this for technical or conversational responses. The content should be formatted Markdown (tables, lists, headers). The title is optional. Always use the same database_id as the analysis. The note is identified by the reserved date 1980-01-01 and displayed as "Analyse IA" in the PnlTracker UI.',
		inputSchema: AppendAiJournalInputSchema,
		annotations: appendToolAnnotations,
	}, async ({ database_id, title, content }) => withErrorBoundary(async () => {
		if (!aiJournalEnabled) return { saved: false, enabled: false, reason: 'AI journal is disabled' }

		const response = asRecord(await api.post('/api/mcp/ai-journal', {
			databaseId: database_id,
			query: {},
			body: { title, content },
		}))
		const note = asRecord(response.note)
		return {
			saved: response.success === true,
			enabled: true,
			note_id: readNumber(note, 'id'),
			note_date: readString(note, 'date'),
			updated_at: readString(note, 'updatedAt'),
		}
	}))

	server.registerTool('clear_ai_journal', {
		description: 'Delete the AI journal note from one database. This permanently removes ALL appended AI analyses for that database_id. Use this when the user asks to clear or reset the AI journal. A new empty note will be recreated on the next append_ai_journal call.',
		inputSchema: ClearAiJournalInputSchema,
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ database_id }) => withErrorBoundary(async () => {
		const response = asRecord(await api.delete('/api/mcp/ai-journal', { databaseId: database_id, query: {} }))
		return {
			cleared: response.success === true,
			deleted: readNumber(response, 'deleted'),
		}
	}))

	server.registerTool('list_databases', {
		description: 'List all trading databases accessible to the authenticated user. Call this FIRST to discover available database_id values, which are required by most other tools. Returns each database with its id, name, display_name, and is_default flag.',
		inputSchema: z.object({}).strict(),
		annotations: toolAnnotations,
	}, async () => withErrorBoundary(async () => {
		const response = await api.get('/api/database/list', { databaseId: undefined, query: {} })
		return asArray(response).map(value => {
			const database = asRecord(value)
			return {
				id: readNumber(database, 'id'),
				name: readString(database, 'name'),
				display_name: readString(database, 'displayName'),
				is_default: readBoolean(database, 'isDefault'),
			}
		})
	}))

	server.registerTool('list_accounts', {
		description: 'List trading accounts (e.g. MT5/TradingView) in one database. Use the account_ids from the result to filter trades in search_trades or analytics tools.',
		inputSchema: DatabaseInputSchema,
		annotations: toolAnnotations,
	}, async ({ database_id }) => withErrorBoundary(async () => {
		const response = await api.get('/api/account', { databaseId: database_id, query: {} })
		return asArray(response).map(value => {
			const account = asRecord(value)
			return {
				id: readNumber(account, 'id'),
				name: readString(account, 'name'),
				full_name: readString(account, 'fullname'),
				display_name: readString(account, 'displayName'),
			}
		})
	}))

	server.registerTool('list_tags', {
		description: 'List tag groups and tags in one database. Tags are organized in groups (e.g. strategy, timeframe, exit type). Use tag_ids from the result to filter trades in search_trades. Useful for auditing whether trades are properly tagged.',
		inputSchema: DatabaseInputSchema,
		annotations: toolAnnotations,
	}, async ({ database_id }) => withErrorBoundary(async () => {
		const response = await api.get('/api/tags', { databaseId: database_id, query: {} })
		return asArray(response).map(value => {
			const group = asRecord(value)
			return {
				id: readNumber(group, 'id'),
				name: readString(group, 'name'),
				tags: asArray(group.tags).map(mapTag),
			}
		})
	}))

	server.registerTool('list_daily_notes', {
		description: 'List daily journal notes in one database with optional date filters. Notes contain trader commentary and may reference screenshot images. Use date_from/date_to to narrow the range. The AI journal note (date 1980-01-01) is excluded from this list.',
		inputSchema: ListDailyNotesInputSchema,
		annotations: toolAnnotations,
	}, async ({ database_id, date_from, date_to, page, page_size }) => withErrorBoundary(async () => {
		const response = await api.get('/api/notes', {
			databaseId: database_id,
			query: {
				date_from,
				date_to,
				limit: page_size + 1,
				offset: (page - 1) * page_size,
			},
		})
		const rows = asArray(response)
		return {
			notes: rows.slice(0, page_size).map(mapDailyNote),
			page,
			page_size,
			has_more: rows.length > page_size,
		}
	}))

	server.registerTool('search_trades', {
		description: 'Search closed trades in one database with filters: date range (date_field: openDate or closeDate, default closeDate), symbols, account_ids, tag_ids, sides (buy/sell), instrument_types (stock/future/forex/option/crypto/any), pnl_min/pnl_max. Use pnl_mode "net" (default) or "gross". Returns trades with P&L, prices, lot size, commission, exchange, MAE/MFE, tags, and risk/reward. Use page_size up to 200 for large result sets. For performance metrics (win rate, profit factor, Sharpe, etc.) use get_performance_summary instead of computing from raw trades.',
		inputSchema: SearchTradesInputSchema,
		annotations: toolAnnotations,
	}, async ({ database_id, filters, pnl_mode, page, page_size }) => withErrorBoundary(async () => {
		const limit = page_size + 1
		const response = await api.get('/api/trades', {
			databaseId: database_id,
			query: {
				filters: JSON.stringify(toApiFilters(filters, pnl_mode)),
				limit,
				offset: (page - 1) * page_size,
			},
		})
		const rows = asArray(response)
		return {
			trades: rows.slice(0, page_size).map(trade => mapTrade(trade, false)),
			page,
			page_size,
			has_more: rows.length > page_size,
		}
	}))

	server.registerTool('get_trade', {
		description: 'Get a single trade by ID with full details including its attached note text. Use this when the user asks about a specific trade or when you need the trade commentary that search_trades does not include.',
		inputSchema: GetTradeInputSchema,
		annotations: toolAnnotations,
	}, async ({ database_id, trade_id }) => withErrorBoundary(async () => {
		const response = await api.get(`/api/trades/${trade_id}`, { databaseId: database_id, query: {} })
		return mapTrade(response, true)
	}))

	server.registerTool('get_performance_summary', {
		description: 'Get authoritative performance metrics for filtered trades: P&L, win rate, profit factor, Sharpe, Sortino, Calmar, max drawdown, max run-up, R-multiples (total R, average R, profit factor R, P/L ratio R), winning/losing streaks, expectancy, recovery factor, ulcer index, SQN. Use pnl_mode "net" (default) or "gross". PREFER this tool over manually computing metrics from search_trades results. Use filters to scope by date, symbol, account, or tags.',
		inputSchema: AnalyticsInputSchema,
		annotations: toolAnnotations,
	}, async ({ database_id, filters, pnl_mode }) => withErrorBoundary(async () => {
		const response = await api.get('/api/analytics/summary', {
			databaseId: database_id,
			query: { filters: JSON.stringify(toApiFilters(filters, pnl_mode)), mode: pnl_mode },
		})
		return AnalyticsSummaryResponseSchema.parse(response)
	}))

	server.registerTool('get_performance_breakdown', {
		description: 'Break down performance by a dimension: "symbol", "account", "side", "tag", "month", "weekday", "open_hour". Returns per-group metrics (P&L, win rate, profit factor, streaks, etc.). Use pnl_mode "net" (default) or "gross". Useful for comparing which symbols, tags, sides, or time periods are most profitable.',
		inputSchema: BreakdownInputSchema,
		annotations: toolAnnotations,
	}, async ({ database_id, filters, pnl_mode, dimension }) => withErrorBoundary(async () => {
		const response = await api.get('/api/analytics/breakdown', {
			databaseId: database_id,
			query: { filters: JSON.stringify(toApiFilters(filters, pnl_mode)), mode: pnl_mode, dimension },
		})
		return AnalyticsBreakdownResponseSchema.parse(response)
	}))

	server.registerTool('get_pnl_timeseries', {
		description: 'Get periodic and cumulative P&L time series for filtered trades. Interval: "day", "week", "month", or "year". Use pnl_mode "net" (default) or "gross". Returns P&L per period and cumulative totals. Useful for visualizing equity curve progression and identifying drawdown/recovery periods.',
		inputSchema: TimeseriesInputSchema,
		annotations: toolAnnotations,
	}, async ({ database_id, filters, pnl_mode, interval }) => withErrorBoundary(async () => {
		const response = await api.get('/api/analytics/pnl_timeseries', {
			databaseId: database_id,
			query: { filters: JSON.stringify(toApiFilters(filters, pnl_mode)), mode: pnl_mode, interval },
		})
		return PnlTimeseriesResponseSchema.parse(response)
	}))

	server.registerTool('get_note_image', {
		description: 'Fetch a screenshot image attached to a trade or daily note. Returns base64-encoded image data with MIME type. The image_path must match a path found in note content (e.g. "screenshots/nt_12_xxx.png"). Use this when the user asks to see a chart screenshot or trade visual.',
		inputSchema: GetNoteImageInputSchema,
		annotations: toolAnnotations,
	}, async ({ database_id, image_path }) => {
		try {
			const { buffer, mimeType } = await api.getBinary('/api/image', {
				databaseId: database_id,
				query: { path: image_path },
			})
			return {
				content: [{
					type: 'image' as const,
					data: buffer.toString('base64'),
					mimeType,
				}],
			}
		} catch (error) {
			return createToolError(error)
		}
	})
}
