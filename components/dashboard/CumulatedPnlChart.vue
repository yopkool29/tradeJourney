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
        <Bar
            ref="barChartRef"
            :data="chartData"
            :options="chartDisplayOptions"
            :style="`width: 100%; height: ${canvasHeight}px`"
            @click="isModalOpen = true"
        />
    </UCard>
</template>

<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import type { ChartOptions, TooltipItem, ChartTypeRegistry } from 'chart.js'
import { generateCumulatedPnlChartData } from '~/utils/dashboard'
import { CommonModalChart } from '#components'

const { t } = useI18n()

const canvasHeight = ref(250)

const barChartRef = ref()
const isModalOpen = ref(false)
const userStore = useUserStore()
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

// Récupérer la configuration des graphiques
const appConfig = useAppConfig()
const chartColors = appConfig.charts.colors
const chartConfigOptions = appConfig.charts.options

// Données du graphique calculées à partir des trades stockés dans le store
const chartData = computed(() => {
    const data = generateCumulatedPnlChartData(
        userStore.dashBoardFilters.last_results,
        userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year'
    )

    // Appliquer les couleurs et options depuis la configuration
    if (data.datasets && data.datasets.length > 0) {
        // Configuration pour le dataset de type 'bar' (PnL)
        if (data.datasets[1]) {
            data.datasets[1].backgroundColor = isDark.value ? chartColors.cumulatedPnlChart.bar.dark : chartColors.cumulatedPnlChart.bar.light
            data.datasets[1].borderRadius = chartConfigOptions.borderRadius
            data.datasets[1].barPercentage = chartConfigOptions.barPercentage
        }

        // Configuration pour le dataset de type 'line' (Cumulé)
        if (data.datasets[0]) {
            const cumulated = isDark.value ? chartColors.cumulatedPnlChart.point.dark : chartColors.cumulatedPnlChart.point.light
            data.datasets[0].label = t('components.dashboard.index.cumulated_label')
            data.datasets[0].borderColor = cumulated
            data.datasets[0].backgroundColor = cumulated
            data.datasets[0].tension = chartConfigOptions.tension
            data.datasets[0].pointRadius = chartConfigOptions.pointRadius
            data.datasets[0].pointBackgroundColor = cumulated
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
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y)
                        },
                    },
                },
                // Afficher les valeurs au-dessus des barres
                datalabels: {
                    display: function () {
                        // N'afficher que pour les barres (type 'bar'), pas pour les lignes
                        return chartColors.datalabels.display
                    },
                    // Positionnement intelligent en fonction de la valeur et des limites du graphique
                    align: function (context) {
                        return getSmartLabelAlign(context)
                    },
                    anchor: function (context) {
                        return getSmartLabelAnchor(context)
                    },

                    color: isDark.value ? chartColors.datalabels.dark : chartColors.datalabels.light,
                    font: {
                        weight: 'bold',
                    },
                    formatter: (value: number) => '$' + value.toFixed(0),
                },
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: isDark.value ? '#444' : '#e5e7eb' },
                    ticks: { color: isDark.value ? '#fff' : '#222' },
                },
                x: {
                    grid: { color: isDark.value ? '#444' : '#e5e7eb' },
                    ticks: { color: isDark.value ? '#fff' : '#222' },
                },
            },
            backgroundColor: isDark.value ? '#18181b' : '#fff',
        }) as ChartOptions
)

function adjustCanvasHeight(height: number) {
    if (!barChartRef.value?.$el) return
    barChartRef.value.$el.style.height = `${height}px`
}

onActivated(() => {
    adjustCanvasHeight(canvasHeight.value)
})

onMounted(() => {
    window.addEventListener('resize', () => adjustCanvasHeight(canvasHeight.value))
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', () => adjustCanvasHeight(canvasHeight.value))
})
</script>
