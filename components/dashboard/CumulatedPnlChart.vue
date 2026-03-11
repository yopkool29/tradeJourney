<template>
    <UCard class="h-full" :ui="{ header: 'p-0' }">
        <template #header>
            <div class="flex items-center gap-2 w-full">
                <span class="font-semibold">{{ $t('components.dashboard.cumulated_pnl_chart.title') }}</span>
                <button
                    class="ml-auto px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
                    :title="$t('components.dashboard.cumulated_pnl_chart.enlarge')"
                    @click="isModalOpen = true"
                >
                    <UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
                </button>
                <CommonModalChart v-model="isModalOpen" :title="$t('components.dashboard.cumulated_pnl_chart.enlarged_title')">
                    <template #content>
                        <Bar :data="chartData" :options="chartDisplayOptions" style="width: 100%; height: 100%" />
                    </template>
                </CommonModalChart>
            </div>
        </template>
        <div :style="`width: 100%; height: ${canvasHeight}px`">
            <Bar
                ref="barChartRef"
                :data="chartData"
                :options="chartDisplayOptions"
                @click="isModalOpen = true"
            />
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import type { ChartOptions, TooltipItem, ChartTypeRegistry } from 'chart.js'
import { generateCumulatedPnlChartData } from '~/utils/dashboard'
import { CommonModalChart } from '#components'

const { formatCurrency } = useUtils()

const { t } = useI18n()


const barChartRef = ref()
const isModalOpen = ref(false)
const userStore = useUserStore()

// Récupérer la configuration des graphiques
const appConfig = useAppConfig()
const chartConfigOptions = appConfig.charts.options

const canvasHeight = computed(() => chartConfigOptions.canvasHeight)

const { pointColor, isDark, profitColor, lossColor } = useTypeColors('cumulatedPnlChart')

// Données du graphique calculées à partir des trades stockés dans le store
const chartData = computed(() => {
    const data = generateCumulatedPnlChartData(
        userStore.dashBoardFilters.last_results,
        userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year'
    )

    // Appliquer les couleurs et options depuis la configuration
    if (data.datasets && data.datasets.length > 0) {
        // Configuration pour le dataset de type 'bar' (PnL) - couleurs profit/loss
        if (data.datasets[1]) {
            // Colorer chaque barre selon sa valeur (positif = profit, négatif = loss)
            const pnlData = data.datasets[1].data as number[]
            data.datasets[1].backgroundColor = pnlData.map(value =>
                value >= 0 ? profitColor.value : lossColor.value
            )
            data.datasets[1].borderRadius = chartConfigOptions.borderRadius
            data.datasets[1].barPercentage = chartConfigOptions.barPercentage
        }

        // Configuration pour le dataset de type 'line' (Cumulé)
        if (data.datasets[0]) {
            data.datasets[0].label = t('components.dashboard.index.cumulated_label')
            data.datasets[0].borderColor = pointColor.value
            data.datasets[0].backgroundColor = pointColor.value
            data.datasets[0].tension = chartConfigOptions.tension
            data.datasets[0].pointRadius = chartConfigOptions.pointRadius
            data.datasets[0].pointBackgroundColor = pointColor.value
        }
    }

    return data
})

const chartDisplayOptions = computed(
    () =>
        ({
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 200,
            },
            hover: {
                mode: 'nearest',
                intersect: false,
            },
            responsiveAnimationDuration: 0,
            plugins: {
                legend: { display: false },
                crosshair: {
                    line: {
                        color: isDark.value ? '#fff' : '#222',
                        width: 1,
                    },
                    sync: {
                        enabled: true,
                        group: 1,
                    },
                    zoom: {
                        enabled: false,
                    },
                    snap: {
                        enabled: false,
                    },
                },
                tooltip: {
                    animation: {
                        duration: 200,
                    },
                    callbacks: {
                        label: function (context: TooltipItem<keyof ChartTypeRegistry>) {
                            const value = context.parsed.y
                            const label = context.dataset.label || ''
                            const date = context.label || ''
                            return [
                                date ? `Date: ${date}` : '',
                                `${label}: ${formatCurrency(value)}`
                            ].filter(Boolean)
                        },
                    },
                },
                // Afficher les valeurs au-dessus des barres
                datalabels: {
                    display: function () {
                        // N'afficher que pour les barres (type 'bar'), pas pour les lignes
                        return appConfig.charts.colors.datalabels.display
                    },
                    // Positionnement intelligent en fonction de la valeur et des limites du graphique
                    align: function (context) {
                        return getSmartLabelAlign(context)
                    },
                    anchor: function (context) {
                        return getSmartLabelAnchor(context)
                    },

                    color: isDark.value ? appConfig.charts.colors.datalabels.dark : appConfig.charts.colors.datalabels.light,
                    font: {
                        weight: 'bold',
                    },
                    formatter: (value: number) => formatCurrency(value),
                },
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: isDark.value ? '#444' : '#e5e7eb' },
                    ticks: {
                        color: isDark.value ? '#fff' : '#222',
                        callback: (value) => formatCurrency(Number(value)),
                    },
                },
                x: {
                    grid: { color: isDark.value ? '#444' : '#e5e7eb' },
                    ticks: { color: isDark.value ? '#fff' : '#222' },
                },
            },
            backgroundColor: isDark.value ? '#18181b' : '#fff',
        }) as ChartOptions
)

</script>
