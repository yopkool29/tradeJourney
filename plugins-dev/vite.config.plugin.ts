import { defineConfig } from 'vite'
import { resolve } from 'path'

// Usage: PLUGIN=hello-plugin npx vite build --config plugins-dev/vite.config.plugin.ts
const pluginId = process.env.PLUGIN

if (!pluginId) {
	throw new Error('PLUGIN env variable is required. Usage: PLUGIN=my-plugin npx vite build --config plugins-dev/vite.config.plugin.ts')
}

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, `${pluginId}/index.ts`),
			name: pluginId,
			fileName: 'plugin',
			formats: ['umd'],
		},
		outDir: resolve(__dirname, `../plugins-prod/${pluginId}`),
		emptyOutDir: false,
		rollupOptions: {
			external: [],
		},
	},
})
