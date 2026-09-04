import 'dotenv/config'
import { z } from 'zod'
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const McpConfigSchema = z.object({
	apiToken: z.string().min(1),
	requestTimeoutMs: z.number().int().min(1000).max(60000),
	maxResponseBytes: z.number().int().min(1024).max(10 * 1024 * 1024),
})

export type McpConfig = z.output<typeof McpConfigSchema>

const MCP_PORT_FILE = join(homedir(), '.local', 'share', 'app.pnltracker.desktop', 'mcp-port')
const MCP_TOKEN_FILE = join(homedir(), '.local', 'share', 'app.pnltracker.desktop', 'mcp-token')

// Lire le port dynamique écrit par l'app Tauri
export const readDynamicPort = (): string | null => {
	try {
		if (!existsSync(MCP_PORT_FILE)) return null
		const port = readFileSync(MCP_PORT_FILE, 'utf-8').trim()
		return port || null
	} catch {
		return null
	}
}

// Lire le token dynamique écrit par l'app Tauri
export const readDynamicToken = (): string | null => {
	try {
		if (!existsSync(MCP_TOKEN_FILE)) return null
		const token = readFileSync(MCP_TOKEN_FILE, 'utf-8').trim()
		return token || null
	} catch {
		return null
	}
}

// Résoudre l'URL de l'API à chaque appel : port dynamique Tauri > PNLTRACKER_API_URL > défaut 3003
export const resolveApiUrl = (): string => {
	const dynamicPort = readDynamicPort()
	if (dynamicPort) return `http://127.0.0.1:${dynamicPort}`
	return process.env.PNLTRACKER_API_URL || ''
}

// Résoudre le token à chaque appel : token dynamique Tauri > PNLTRACKER_MCP_TOKEN
export const resolveApiToken = (): string => {
	const dynamicToken = readDynamicToken()
	if (dynamicToken) return dynamicToken
	return process.env.PNLTRACKER_MCP_TOKEN || ''
}

export const getMcpConfig = (): McpConfig => McpConfigSchema.parse({
	apiToken: resolveApiToken(),
	requestTimeoutMs: Number(process.env.PNLTRACKER_MCP_TIMEOUT_MS || 15000),
	maxResponseBytes: Number(process.env.PNLTRACKER_MCP_MAX_RESPONSE_BYTES || 2 * 1024 * 1024),
})
