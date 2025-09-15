// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    // Configuration pour Vercel
    nitro: {
        preset: process.env.NITRO_PRESET || 'node-server',
        esbuild: {
            options: {
                target: 'es2020'
            }
        },
        publicAssets: [
            {
                dir: 'upload',
                baseURL: '/upload'
            }
        ]
    },
    compatibilityDate: '2024-11-01',

    sourcemap: {
        server: process.env.NODE_ENV !== 'production',
        client: process.env.NODE_ENV !== 'production'
    },

    // ssr: false,

    devtools: { enabled: false },

    debug: false,

    app: {
        head: {
            title: 'TradeJourney - Journal de Trading',
            meta: [
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1' },
                { name: 'description', content: 'TradeJourney - Votre journal de trading pour suivre et analyser vos performances' }
            ],
            link: [
                { rel: 'icon', type: 'image/svg+xml', href: '/img/favicon.svg' }
            ]
        }
    },

    modules: [
        '@nuxt/ui',
        '@nuxt/eslint',
        '@nuxt/fonts',
        '@nuxt/icon',
        '@nuxt/image',
        '@nuxt/scripts',
        '@pinia/nuxt',
        'pinia-plugin-persistedstate/nuxt',
        '@nuxtjs/color-mode',
        'nuxt-tiptap-editor',
        'nuxt-zod-i18n',
        '@nuxtjs/i18n'
    ],
    i18n: {
        locales: [
            { code: 'en', iso: 'en-US', file: 'en.js'},
            { code: 'fr', iso: 'fr-FR', file: 'fr.js' },
        ],
        defaultLocale: 'en',
        lazy: true,
        langDir: 'locales',
        strategy: 'no_prefix',
        bundle: {
            optimizeTranslationDirective: false,
        }
    },
    tiptap: {
        prefix: 'Tiptap', //prefix for Tiptap imports, composables not included
    },
    icon: {
        clientBundle: {
            scan: true
        },
        provider: 'iconify'
    },

    runtimeConfig: {
        public: {
            maxFileSize: 10 * 1024 * 1024 // 10MB
        }
    },

    image: {
        providers: {
            selfproxyhost: {
                name: 'selfproxyhost',
                provider: '~/providers/selfproxyhost.ts',
                options: {
                },
            },
            selfhost: {
                name: 'selfhost',
                provider: '~/providers/selfhost.ts',
                options: {
                },
            },
        },
    },
    ui: {
        primary: 'blue',
        gray: 'slate',
        icons: ['heroicons'],
        table: {
            default: {
                emptyState: {
                    icon: 'i-heroicons-document-text',
                    label: 'Aucune donnée'
                }
            }
        },
        strategy: 'override',
        defaultLocale: 'fr',
        locales: ['fr']
    },

    css: ['~/assets/css/main.css'],

    colorMode: {
        classSuffix: '',
        preference: 'light', // mode par défaut
        fallback: 'system',
    },
    typescript: {
        tsConfig: {
            compilerOptions: {
                sourceMap: true,
                inlineSources: true
            }
        }
    }
})