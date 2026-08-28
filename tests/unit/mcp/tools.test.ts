import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PnlTrackerApiClient } from '~/mcp/apiClient'
import { registerTools } from '~/mcp/tools'

let httpServer: Server
let mcpServer: McpServer
let client: Client
let apiUrl: string

const respond = (response: import('node:http').ServerResponse, value: unknown) => {
	response.writeHead(200, { 'content-type': 'application/json' })
	response.end(JSON.stringify(value))
}

const tradeResponse = {
	id: 7,
	openDate: '2026-08-01T10:00:00.000Z',
	closeDate: '2026-08-01T11:00:00.000Z',
	symbol: 'ES',
	type: 'buy',
	instrumentType: 'future',
	lot: 1,
	profit: 100,
	netProfit: 95,
	note: 'private note',
	metadata: {
		riskReward: 2,
		detailedNote: 'allowed detailed note',
		spreadType: 'vertical',
		posEffect: 'opening',
		orderType: 'limit',
		legs: [{ strike: 5000, type: 'call', qty: 1, price: 12.5, expiration: '2026-09-18' }],
		arbitrarySecret: 'must not leak',
	},
	screenshots: [{ url: '/private.png' }],
}

describe('PnlTracker MCP tools', () => {
	beforeAll(async () => {
		httpServer = createServer((request, response) => {
			expect(request.headers['x-api-token']).toBe('test-token')
			if (request.url === '/api/database/list') {
				respond(response, [{ id: 1, name: 'main', displayName: 'Main', isDefault: true, schemaName: 'private' }])
				return
			}
			if (request.url?.startsWith('/api/notes?')) {
				expect(request.headers['x-database-id']).toBe('1')
				respond(response, [{
					id: 12,
					date: '2026-08-10T08:00:00.000Z',
					updatedAt: '2026-08-10T09:00:00.000Z',
					content: 'Daily market review',
					metadata: { subtitle: 'Morning plan', privateKey: 'must not leak' },
				}])
				return
			}
			if (request.url?.startsWith('/api/trades?')) {
				expect(request.headers['x-database-id']).toBe('1')
				respond(response, [tradeResponse])
				return
			}
			if (request.url === '/api/trades/7') {
				expect(request.headers['x-database-id']).toBe('1')
				respond(response, tradeResponse)
				return
			}
			response.writeHead(404, { 'content-type': 'application/json' })
			response.end('{}')
		})
		await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve))
		apiUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`

		mcpServer = new McpServer({ name: 'test-pnltracker', version: '1.0.0' })
		registerTools(mcpServer, new PnlTrackerApiClient({
			apiUrl,
			apiToken: 'test-token',
			requestTimeoutMs: 1000,
			maxResponseBytes: 1024 * 1024,
		}))
		client = new Client({ name: 'test-client', version: '1.0.0' })
		const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
		await Promise.all([mcpServer.connect(serverTransport), client.connect(clientTransport)])
	})

	afterAll(async () => {
		await client.close()
		await mcpServer.close()
		await new Promise<void>((resolve, reject) => httpServer.close(error => error ? reject(error) : resolve()))
	})

	it('advertises only the nine read-only tools', async () => {
		const result = await client.listTools()
		expect(result.tools.map(tool => tool.name)).toEqual([
			'list_databases',
			'list_accounts',
			'list_tags',
			'list_daily_notes',
			'search_trades',
			'get_trade',
			'get_performance_summary',
			'get_performance_breakdown',
			'get_pnl_timeseries',
		])
		expect(result.tools.every(tool => tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint === false)).toBe(true)
		const notesTool = result.tools.find(tool => tool.name === 'list_daily_notes')
		expect(notesTool?.inputSchema.required).toContain('database_id')
		expect(notesTool?.inputSchema.properties).toHaveProperty('page_size')
	})

	it('allowlists metadata and only includes detailed notes in get_trade', async () => {
		const databases = await client.callTool({ name: 'list_databases', arguments: {} })
		expect(JSON.stringify(databases)).not.toContain('schemaName')

		const notes = await client.callTool({ name: 'list_daily_notes', arguments: { database_id: 1 } })
		const serializedNotes = JSON.stringify(notes)
		expect(serializedNotes).toContain('Daily market review')
		expect(serializedNotes).toContain('Morning plan')
		expect(serializedNotes).not.toContain('privateKey')
		expect(serializedNotes).not.toContain('must not leak')

		const trades = await client.callTool({ name: 'search_trades', arguments: { database_id: 1 } })
		const serializedTrades = JSON.stringify(trades)
		expect(serializedTrades).toContain('ES')
		expect(serializedTrades).toContain('risk_reward')
		expect(serializedTrades).toContain('vertical')
		expect(serializedTrades).not.toContain('allowed detailed note')
		expect(serializedTrades).not.toContain('must not leak')
		expect(serializedTrades).not.toContain('private note')
		expect(serializedTrades).not.toContain('private.png')

		const trade = await client.callTool({ name: 'get_trade', arguments: { database_id: 1, trade_id: 7 } })
		const serializedTrade = JSON.stringify(trade)
		expect(serializedTrade).toContain('allowed detailed note')
		expect(serializedTrade).not.toContain('must not leak')
		expect(serializedTrade).not.toContain('private note')
	})
})
