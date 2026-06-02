export default defineAppConfig({
    // Configuration des graphiques
    charts: {
        options: {
            canvasHeight: 200,
            // Options communes pour tous les graphiques
            barPercentage: 0.6,
            borderRadius: 2,
            tension: 0.4, // Pour les lignes courbes
            pointRadius: 2,
            // Options spécifiques pour certains types de graphiques
            winrate: {
                max: 100, // Valeur maximale pour l'axe Y du graphique Winrate
                format: (value) => value + '%', // Formattage des valeurs
            },
            pnlBarChart: {
                maxTrades: 100, // Nombre maximum de trades à afficher dans le graphique P&L History
            },
        },
    },
    ui: {
        colors: {
            // primary: 'green',
            primary: 'emerald',
            neutral: 'slate',
        },
        formField: {
            slots: {
                error: 'font-semibold text-red-500',
            },
        },
        collapsible: {
            slots: {
                content:
                    'data-[state=open]:animate-[collapsible-down_10ms_ease-out] data-[state=closed]:animate-[collapsible-up_10ms_ease-out] ',
            },
        },
        badge: {
            slots: {},
        },
        tooltip: {
            slots: {
                content: 'data-[state=closed]:animate-none',
            },
        },
        button: {
            slots: {
                base: 'cursor-pointer user-select: none transition-transform hover:scale-105',
            },
        },
        alert: {
            slots: {
                description: 'font-semibold',
            }
        },
        tabs: {
            slots: {
                // trigger: 'hover:text-primary-600',
            },
        },
        card: {
            variants: {
                variant: {
                    subtle: {
                        root: 'light:bg-gradient-to-br light:from-gray-100 light:to-gray-50 dark:bg-slate-900/50 border-gray-500 dark:border-slate-800'
                    }
                }
            }
        }
    },
})
