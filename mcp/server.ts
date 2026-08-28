import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { PnlTrackerApiClient } from './apiClient'
import { getMcpConfig } from './config'
import { registerTools } from './tools'

const server = new McpServer({
	name: 'pnltracker',
	version: '1.0.0',
})

registerTools(server, new PnlTrackerApiClient(getMcpConfig()))

const transport = new StdioServerTransport()
await server.connect(transport)

const shutdown = async () => {
	await server.close()
	process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
