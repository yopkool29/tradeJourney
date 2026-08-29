import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { PnlTrackerApiClient } from './apiClient'
import { getMcpConfig } from './config'
import { registerTools } from './tools'

const server = new McpServer({
	name: 'pnltracker',
	version: '1.0.0',
}, {
	instructions: 'AI journal mode is enabled by default. After every user-requested answer based on PnlTracker data, including counts, metrics, summaries, comparisons, and trading analyses, call append_ai_journal with the target database and the complete Markdown result before answering the user. Do not journal technical, configuration, implementation, or casual conversational responses. If the user asks to disable or enable journaling, call set_ai_journal_enabled with the requested value. The setting applies until this MCP process restarts.',
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
