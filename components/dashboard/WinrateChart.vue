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
        <div :style="`width: 100%; height: ${canvasHeight}px`" style="cursor: pointer;">
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
import type { ChartOptions } from 'chart.js'
import { useUserStore } from '~/stores/user'
import { generateWinrateChartData, getSmartLabelAlign, getSmartLabelAnchor } from '~/utils/dashboard'
import { defaultSettings } from '~/schema/user'

const barChartRef = ref()
const isModalOpen = ref(false)
const modalBarChartRef = ref()
const userStore = useUserStore()
const { t } = useI18n()

// Récupérer la configuration des graphiques
const appConfig = useAppConfig()
const chartConfigOptions = appConfig.charts.options

const canvasHeight = computed(() => chartConfigOptions.canvasHeight)

const { barColor, movingAverageColor, isDark } = useTypeColors('winrateChart')

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
        data.datasets[1].backgroundColor = barColor.value
        data.datasets[1].borderRadius = chartConfigOptions.borderRadius
        data.datasets[1].barPercentage = chartConfigOptions.barPercentage

        // Ligne moyenne mobile
        data.datasets[0].borderColor = movingAverageColor.value
        data.datasets[0].backgroundColor = movingAverageColor.value
        data.datasets[0].pointBackgroundColor = movingAverageColor.value
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
                    callbacks: {
                        label: function (context: TooltipItem<keyof ChartTypeRegistry>) {
                            const value = context.parsed.y
                            const label = context.dataset.label || ''
                            const date = context.label || ''
                            return [
                                date ? `Date: ${date}` : '',
                                `${label}: ${value.toFixed(0)}%`
                            ].filter(Boolean)
                        },
                    },
                },
                // Afficher les valeurs au-dessus des barres
                datalabels: {
                    display: function () {
                        // Afficher les datalabels seulement pour les barres
                        return appConfig.charts.colors.datalabels.display
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
                    color: isDark.value ? appConfig.charts.colors.datalabels.dark : appConfig.charts.colors.datalabels.light,
                    formatter: (value: number) => value.toFixed(0) + '%',
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: isDark.value ? '#444' : '#e5e7eb' },
                    ticks: { callback: (v) => v + '%' },
                },
                x: {
                    grid: { color: isDark.value ? '#444' : '#e5e7eb' },
                },
            },
            backgroundColor: isDark.value ? '#18181b' : '#fff',
        }) as ChartOptions
)
</script>
