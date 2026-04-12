import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFile } from 'fs/promises'
import AdmZip from 'adm-zip'
import vue from '@vitejs/plugin-vue'

// Usage: PLUGIN=hello-plugin npx vite build --config plugins-dev/vite.config.plugin.ts
const pluginId = process.env.PLUGIN

if (!pluginId) {
	throw new Error('PLUGIN env variable is required. Usage: PLUGIN=my-plugin npx vite build --config plugins-dev/vite.config.plugin.ts')
}

const outDir = resolve(__dirname, `../plugins-prod/${pluginId}`)

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, `${pluginId}/index.ts`),
			name: pluginId,
			fileName: 'plugin',
			formats: ['umd'],
		},
		outDir,
		emptyOutDir: false,
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
				// Copy manifest into outDir before zipping
				const manifestSrc = resolve(__dirname, `${pluginId}/manifest.json`)
				const manifestDst = resolve(outDir, 'manifest.json')
				await copyFile(manifestSrc, manifestDst)

				// Create ZIP archive
				const zip = new AdmZip()
				zip.addLocalFolder(outDir, pluginId)
				const zipPath = resolve(__dirname, `../plugins-prod/${pluginId}.zip`)
				zip.writeZip(zipPath)
				console.log(`✓ Created ${pluginId}.zip`)
			},
		},
	],
})
