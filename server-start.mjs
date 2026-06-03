#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

// Polyfill __dirname and __filename globally before loading Nitro
if (typeof globalThis.__dirname === 'undefined') {
    globalThis.__dirname = dirname(fileURLToPath(import.meta.url))
}
if (typeof globalThis.__filename === 'undefined') {
    globalThis.__filename = fileURLToPath(import.meta.url)
}

// Now load and start the Nitro server
console.log('🚀 Starting PnlTracker server...')
console.log(`📱 Web interface: http://localhost:${process.env.EXTERNAL_PORT || 3000}`)
console.log(`🔗 Internal port: 3000`)
console.log(`🐳 Running in Docker container`)
console.log(`🗄️  PostgreSQL: localhost:${process.env.POSTGRES_EXTERNAL_PORT || 5432}`)
await import('./.output/server/index.mjs')
