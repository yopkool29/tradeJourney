import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readFile, writeFile } from 'fs/promises'
import AdmZip from 'adm-zip'
import vue from '@vitejs/plugin-vue'

// Plugin system version - change when SDK or plugin architecture changes
const PLUGIN_SYSTEM_VERSION = "1.0"

// Usage: PLUGIN=hello-plugin npx vite build --config plugins-dev/vite.config.plugin.ts
const pluginId = process.env.PLUGIN

if (!pluginId) {
	throw new Error('PLUGIN env variable is required. Usage: PLUGIN=my-plugin npx vite build --config plugins-dev/vite.config.plugin.ts')
}

const outDir = resolve(__dirname, `_release/${pluginId}`)

export default defineConfig({
	publicDir: false,
	build: {
		lib: {
			entry: resolve(__dirname, `${pluginId}/index.ts`),
			name: pluginId,
			fileName: 'plugin',
			formats: ['umd'],
		},
		outDir,
		emptyOutDir: true,
		minify: process.env.RELEASE === 'true',
		rollupOptions: {
			external: ['vue'],
			output: {
				globals: {
					vue: 'Vue',
				},
			},
		},
	},
	plugins: [
		vue(),
		{
			name: 'zip-plugin',
			closeBundle: async () => {
				// Read and enrich manifest with plugin system version
				const manifestSrc = resolve(__dirname, `${pluginId}/manifest.json`)
				const manifestContent = await readFile(manifestSrc, 'utf-8')
				const manifest = JSON.parse(manifestContent)
				
				// Add plugin system version to manifest
				manifest.pluginSystemVersion = PLUGIN_SYSTEM_VERSION
				
				// Write enriched manifest to outDir
				const manifestDst = resolve(outDir, 'manifest.json')
				await writeFile(manifestDst, JSON.stringify(manifest, null, 2), 'utf-8')

				// Create ZIP archive with enriched manifest
				const zip = new AdmZip()
				zip.addLocalFolder(outDir, pluginId)
				const zipPath = resolve(__dirname, `_release/${pluginId}.zip`)
				zip.writeZip(zipPath)
				console.log(`✓ Created ${pluginId}.zip with pluginSystemVersion ${PLUGIN_SYSTEM_VERSION}`)
			},
		},
	],
})
