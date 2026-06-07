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

    experimental: {
        appManifest: process.env.VITEST !== 'true'
    },

    vite: {
        resolve: {
            alias: {
                'element-resize-detector': '~/shims/element-resize-detector.js'
            }
        },
        server: {
            allowedHosts: [
                '.ngrok-free.dev',
                '.ngrok.io'
            ]
        },
        ssr: {
            noExternal: ['vue', 'vue-router']
        },
        build: {
            chunkSizeWarningLimit: 1000,
            rollupOptions: {
                output: {
                    manualChunks: (id) => {
                        // Charts libraries
                        if (id.includes('chart.js') || id.includes('vue-chartjs') || id.includes('lightweight-charts') || id.includes('echarts') || id.includes('vue-echarts') || id.includes('zrender')) {
                            return 'charts'
                        }
                        // Milkdown editor
                        if (id.includes('@milkdown')) {
                            return 'editor'
                        }
                        // Date libraries
                        if (id.includes('date-fns') || id.includes('@internationalized/date')) {
                            return 'dates'
                        }
                        // Dashboard chart components
                        if (id.includes('/dashboard/') && (
                            id.includes('Winrate') ||
                            id.includes('Chart') ||
                            id.includes('Pnl') ||
                            id.includes('Pie')
                        )) {
                            return 'dashboard-charts'
                        }
                    }
                }
            }
        }
    },

    sourcemap: {
        server: false,
        client: false
        // server: process.env.NODE_ENV !== 'production',
        // client: process.env.NODE_ENV !== 'production'
    },

    routeRules: {
        '/': { ssr: true },
        '/**': { ssr: false },
    },

    debug: false,

    app: {
        head: {
            title: 'PnlTracker - Journal de Trading',
            meta: [
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1' },
                { name: 'description', content: 'PnlTracker - Votre journal de trading pour suivre et analyser vos performances' }
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
            maxScreenshots: 9,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            debugMode: process.env.DEBUG_MODE === 'true',
            polygonApiKey: process.env.POLYGON_API_KEY,
            quantowerEnable: process.env.QUANTOWER_ENABLE === 'true',
            appTagVersion: process.env.APP_VERSION,
            enableRouteLogger: false,
            enableApiLogger: process.env.DEBUG_MODE === 'true',
            pluginsEnabled: process.env.PLUGINS_ENABLED === 'true',
            showLogView: process.env.SHOW_LOG_VIEW === 'true',
            tradeCountThreshold: 1000,
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
                sourceMap: false
            }
        }
    }
})