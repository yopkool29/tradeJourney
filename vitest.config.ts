import { defineVitestConfig } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'

export default defineVitestConfig({
    test: {
        globals: true,
        environment: 'nuxt',
        environmentOptions: {
            nuxt: {
                rootDir: fileURLToPath(new URL('./', import.meta.url)),
                domEnvironment: 'happy-dom'
            }
        }
    }
})
