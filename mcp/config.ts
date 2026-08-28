import 'dotenv/config'
import { z } from 'zod'

const McpConfigSchema = z.object({
	apiUrl: z.string().url().transform(value => value.replace(/\/$/, '')),
	apiToken: z.string().min(1),
	requestTimeoutMs: z.number().int().min(1000).max(60000),
	maxResponseBytes: z.number().int().min(1024).max(10 * 1024 * 1024),
})

export type McpConfig = z.output<typeof McpConfigSchema>

export const getMcpConfig = (): McpConfig => McpConfigSchema.parse({
	apiUrl: process.env.PNLTRACKER_API_URL || 'http://127.0.0.1:3003',
	apiToken: process.env.PNLTRACKER_MCP_TOKEN || process.env.ADMIN_API_TOKEN,
	requestTimeoutMs: Number(process.env.PNLTRACKER_MCP_TIMEOUT_MS || 15000),
	maxResponseBytes: Number(process.env.PNLTRACKER_MCP_MAX_RESPONSE_BYTES || 2 * 1024 * 1024),
})
