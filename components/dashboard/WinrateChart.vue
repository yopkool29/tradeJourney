<template>
    <UCard class="h-full" :ui="{ header: 'p-0' }">
        <template #header>
            <div class="flex items-center gap-2 w-full">
                <span class="font-semibold">{{ $t('components.dashboard.winrate_chart.title') }}</span>
                <button
                    class="ml-auto px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
                    :title="$t('components.dashboard.winrate_chart.enlarge')"
                    @click="isModalOpen = true"
                >
                    <UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
                </button>
                <CommonModalChart v-model="isModalOpen" :title="$t('components.dashboard.winrate_chart.enlarged_title')">
                    <template #content>
                        <Bar ref="modalBarChartRef" :data="chartData" :options="chartDisplayOptions" style="width: 100%; height: 100%" />
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
import type { ChartOptions } from 'chart.js'
import { useUserStore } from '~/stores/user'
import { generateWinrateChartData, getSmartLabelAlign, getSmartLabelAnchor } from '~/utils/dashboard'

const canvasHeight = ref(250)

const barChartRef = ref()
const isModalOpen = ref(false)
const modalBarChartRef = ref()
const userStore = useUserStore()
const colorMode = useColorMode()
const { t } = useI18n()

const isDark = computed(() => colorMode.value === 'dark')

// Récupérer la configuration des graphiques
const appConfig = useAppConfig()
const chartColors = appConfig.charts.colors
const chartConfigOptions = appConfig.charts.options

// Données du graphique calculées à partir des trades stockés dans le store
const chartData = computed(() => {
    const data = generateWinrateChartData(
        userStore.dashBoardFilters.last_results,
        userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year',
        3 // fenêtre de moyenne mobile
    )

    // Personnaliser les couleurs et options pour chaque dataset
    if (data.datasets && data.datasets.length > 1) {
        // Barres winrate
        data.datasets[1].backgroundColor = chartColors.winrate.bar
        data.datasets[1].borderRadius = chartConfigOptions.borderRadius
        data.datasets[1].barPercentage = chartConfigOptions.barPercentage

        // Ligne moyenne mobile (optionnel : couleur personnalisée)
        data.datasets[0].borderColor = (isDark.value ? chartColors.winrate.movingAverage.dark : chartColors.winrate.movingAverage.light) || '#6366f1'
        data.datasets[0].backgroundColor =
            ((isDark.value ? chartColors.winrate.movingAverage.dark : chartColors.winrate.movingAverage.light) || '#6366f1') + '33'
        data.datasets[0].pointBackgroundColor =
            (isDark.value ? chartColors.winrate.movingAverage.dark : chartColors.winrate.movingAverage.light) || '#6366f1'
        data.datasets[0].pointRadius = chartConfigOptions.pointRadius
        data.datasets[0].label = t('components.dashboard.index.mobile_avg_label')
    }

    return data
})

// Options du graphique avec les paramètres de la configuration
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
                        color: isDark.value ? '#888' : '#222',
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
                    trigger: 'axis',
                    // callbacks: {
                    //     label: function (context: { formattedValue: string; dataset: { type: string } }) {
                    //         return 'Win Rate: ' + context.formattedValue + '%'
                    //     },
                    // },
                },
                // Afficher les valeurs au-dessus des barres
                datalabels: {
                    display: function () {
                        // Afficher les datalabels seulement pour les barres
                        return chartColors.datalabels.display
                    },
                    // Positionnement intelligent en fonction de la valeur
                    align: function (context) {
                        return getSmartLabelAlign(context)
                    },
                    anchor: function (context) {
                        return getSmartLabelAnchor(context)
                    },
                    font: {
                weight: 'bold',
            },
                    color: isDark.value ? chartColors.datalabels.dark : chartColors.datalabels.light,
                    formatter: (value: number) => value.toFixed(0) + '%',
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: isDark.value ? '#444' : '#e5e7eb' },
                    ticks: { color: isDark.value ? '#fff' : '#222', callback: (v) => v + '%' },
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
