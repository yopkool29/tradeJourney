<template>
    <UCard class="h-full" :ui="{ header: 'p-0' }">
        <template #header>
            <div class="flex items-center gap-2 w-full">
                <span class="font-semibold">{{ $t('components.dashboard.cumulated_pnl_chart.title') }}</span>
                <button class="ml-auto px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
                    :title="$t('components.dashboard.cumulated_pnl_chart.enlarge')" @click="isModalOpen = true">
                    <UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
                </button>
                <CommonModalChart v-model="isModalOpen"
                    :title="$t('components.dashboard.cumulated_pnl_chart.enlarged_title')">
                    <template #content>
                        <Line :data="chartData" :options="chartDisplayOptions" style="width: 100%; height: 100%" />
                    </template>
                </CommonModalChart>
            </div>
        </template>
        <div :style="`width: 100%; height: ${canvasHeight}px`" style="cursor: pointer;">
            <Line ref="lineChartRef" :data="chartData" :options="chartDisplayOptions" @click="isModalOpen = true" />
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'
import type { ChartOptions, TooltipItem, ChartTypeRegistry, ChartDataset } from 'chart.js'
import { generateCumulatedPnlChartData } from '~/utils/dashboard'
import { colorToRgba } from '~/utils/color-utils'
import { CommonModalChart } from '#components'
import { useTypeColors } from '~/composables/useTypeColors'

const { formatCurrency } = useUtils()
const { t } = useI18n()

const lineChartRef = ref()
const isModalOpen = ref(false)
const userStore = useUserStore()

// Récupérer la configuration des graphiques
const appConfig = useAppConfig()
const chartConfigOptions = appConfig.charts.options

const canvasHeight = computed(() => chartConfigOptions.canvasHeight)

const { profitColor, lossColor } = useTypeColors('cumulatedPnlChart')

// Données du graphique calculées à partir des trades stockés dans le store
const chartData = computed(() => {
    const data = generateCumulatedPnlChartData(
        userStore.dashBoardFilters.last_results,
        userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year'
    )

    const profitBgColor = colorToRgba(profitColor.value, 0.2)
    const lossBgColor = colorToRgba(lossColor.value, 0.2)

    // Configuration pour afficher une courbe pleine avec transparence
    if (data.datasets && data.datasets.length > 0) {
        // Garder seulement le premier dataset (la ligne cumulée)
        data.datasets = [data.datasets[0]]

        if (data.datasets[0]) {
            const dataset = data.datasets[0] as ChartDataset<'line'>
            const values = dataset.data as number[]

            dataset.label = t('components.dashboard.index.cumulated_label')
            dataset.tension = 0.05
            dataset.pointRadius = 0
            dataset.pointBorderWidth = 0
            dataset.borderWidth = 2
            dataset.fill = 'start'

            // Couleurs conditionnelles pour les segments
            data.datasets[0].segment = {
                borderColor: (ctx: { p1: { parsed: { y: number } } }) => {
                    const value = ctx.p1.parsed.y
                    return value >= 0 ? profitColor.value : lossColor.value
                },
                backgroundColor: (ctx: { p1: { parsed: { y: number } } }) => {
                    const value = ctx.p1.parsed.y
                    return value >= 0 ? profitBgColor : lossBgColor
                }
            }

            // Couleurs conditionnelles pour les points
            data.datasets[0].pointBackgroundColor = values.map(v =>
                v >= 0 ? profitColor.value : lossColor.value
            )
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
                        color: '#666',
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
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
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
                datalabels: {
                    display: false,
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(200, 200, 200, 0.2)' },
                    ticks: {
                        color: '#666',
                        callback: (value) => formatCurrency(Number(value)),
                    },
                },
                x: {
                    grid: { color: 'rgba(200, 200, 200, 0.2)' },
                    ticks: { color: '#666' },
                },
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
        }) as ChartOptions
)

</script>
