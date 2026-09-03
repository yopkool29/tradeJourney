import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { existsSync } from 'node:fs'

if (typeof globalThis.__dirname === 'undefined') {
	globalThis.__dirname = dirname(fileURLToPath(import.meta.url))
}
if (typeof globalThis.__filename === 'undefined') {
	globalThis.__filename = fileURLToPath(import.meta.url)
}

// Charger le .env généré par le desktop s'il existe
const envPath = `${globalThis.__dirname}/.env`
if (existsSync(envPath)) {
	try {
		process.loadEnvFile(envPath)
	} catch {
		// Fallback: parser manuellement si loadEnvFile n'est pas disponible
		const content = await import('node:fs/promises').then(fs => fs.readFile(envPath, 'utf-8'))
		for (const line of content.split('\n')) {
			const trimmed = line.trim()
			if (!trimmed || trimmed.startsWith('#')) continue
			const eqIdx = trimmed.indexOf('=')
			if (eqIdx === -1) continue
			const key = trimmed.slice(0, eqIdx).trim()
			const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
			if (!(key in process.env)) process.env[key] = value
		}
	}
}

await import('./.output/server/index.mjs')
