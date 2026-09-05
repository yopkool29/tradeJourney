import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

if (typeof globalThis.__dirname === 'undefined') {
	globalThis.__dirname = dirname(fileURLToPath(import.meta.url))
}
if (typeof globalThis.__filename === 'undefined') {
	globalThis.__filename = fileURLToPath(import.meta.url)
}

await import('./.output/server/index.mjs')
