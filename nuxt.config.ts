// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2024-11-01',

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
        'nuxt-zod-i18n',
        '@nuxtjs/i18n'
    ],

    fonts: {
        providers: {
            fontshare: false
        }
    },

    devtools: { 
        enabled: true,
        // timeline: {
        //     enabled: true
        // }
     },

    vite: {
        server: {
            allowedHosts: [
                'cindie-unpetalled-hourly.ngrok-free.dev',
                '.ngrok-free.dev',
                '.ngrok.io'
            ]
        },
        ssr: {
            noExternal: ['vue', 'vue-router']
        }
    },

    sourcemap: {
        server: process.env.NODE_ENV !== 'production',
        client: process.env.NODE_ENV !== 'production'
    },

    routeRules: {
        '/': { ssr: true },
        '/**': { ssr: false },
    },

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

    i18n: {
        locales: [
            { code: 'en', iso: 'en-US', file: 'en.js' },
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
    icon: {
        clientBundle: {
            scan: true
        },
        provider: 'iconify'
    },

    runtimeConfig: {
        public: {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            debugMode: process.env.DEBUG_MODE === 'true',
            polygonApiKey: process.env.POLYGON_API_KEY,
            ninjaTraderApiEnable: process.env.NINJATRADER_API_ENABLE === 'true',
            quantowerEnable: process.env.QUANTOWER_ENABLE === 'true',
            appTagVersion: process.env.APP_VERSION,
            enableRouteLogger: false,
            enableApiLogger: process.env.DEBUG_MODE === 'true',
            pluginsEnabled: process.env.PLUGINS_ENABLED === 'true',
            showLogView: process.env.SHOW_LOG_VIEW === 'true' || process.env.NODE_ENV !== 'production'
        }
    },

    // image: {
    //     providers: {
    //         selfproxyhost: {
    //             name: 'selfproxyhost',
    //             provider: '~/providers/selfproxyhost.ts',
    //             options: {
    //             },
    //         },
    //         selfhost: {
    //             name: 'selfhost',
    //             provider: '~/providers/selfhost.ts',
    //             options: {
    //             },
    //         },
    //     },
    // },

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

    css: ['~/assets/css/main.css', '~/assets/css/milkdown-global.scss'],

    colorMode: {
        classSuffix: '',
        preference: 'light', // mode par défaut
        fallback: 'system',
    },
    nitro: {
        esbuild: {
            options: {
                target: 'es2020'
            }
        },
        experimental: {
            wasm: false
        },
        // compressPublicAssets: {
        //     gzip: true,
        //     brotli: true
        // },
        publicAssets: [
            {
                dir: 'upload',
                baseURL: '/upload'
            }
        ]
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