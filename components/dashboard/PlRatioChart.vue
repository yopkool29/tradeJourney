<template>
    <UCard class="h-full" :ui="{ header: 'p-0' }">
        <template #header>
            <div class="flex items-center gap-2 w-full">
                <span class="font-semibold">{{ $t('components.dashboard.pl_ratio_chart.title') }}</span>
                <button
                    class="ml-auto px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
                    :title="$t('components.dashboard.pl_ratio_chart.enlarge')"
                    @click="isModalOpen = true"
                >
                    <UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
                </button>
                <CommonModalChart v-model="isModalOpen" :title="$t('components.dashboard.pl_ratio_chart.enlarged_title')">
                    <template #content>
                        <Bar ref="modalBarChartRef" :data="chartData" :options="chartDisplayOptions" style="width: 100%; height: 100%" />
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
import type { Context } from 'chartjs-plugin-datalabels'
import type { ChartData, ChartOptions, TooltipItem, ChartTypeRegistry } from 'chart.js'
import { useUserStore } from '~/stores/user'
import { generatePlRatioChartData } from '~/utils/dashboard'
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

const chartColors = appConfig.charts.colors

const { barColor, movingAverageColor, isDark } = useTypeColors('plRatioChart')

// Données du graphique calculées à partir des trades stockés dans le store
const chartData = computed((): ChartData => {
    const data = generatePlRatioChartData(
        userStore.dashBoardFilters.last_results,
        userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year',
        3
    )

    // Appliquer les couleurs et options depuis la configuration
    if (data.datasets && data.datasets.length > 1) {
        // Configuration pour la ligne de moyenne mobile (premier dataset)
        data.datasets[0].borderColor = movingAverageColor.value
        data.datasets[0].pointBackgroundColor = movingAverageColor.value
        data.datasets[0].pointRadius = chartConfigOptions.pointRadius
        data.datasets[0].label = t('components.dashboard.index.mobile_avg_label')

        // Configuration pour les barres de P/L Ratio (deuxième dataset)
        data.datasets[1].backgroundColor = barColor.value
        data.datasets[1].borderRadius = chartConfigOptions.borderRadius
        data.datasets[1].barPercentage = chartConfigOptions.barPercentage
    }

    return data
})

const chartDisplayOptions = computed((): ChartOptions => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 200,
    },
    hover: {
        mode: 'nearest' as const,
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
            callbacks: {
                label: function (context: TooltipItem<keyof ChartTypeRegistry>) {
                    return context.dataset.label + ': ' + context.formattedValue
                },
            },
        },
        // Afficher les valeurs au-dessus des barres
        datalabels: {
            display: function () {
                return chartColors.datalabels.display
            },
            // Positionnement intelligent en fonction de la valeur et des limites du graphique
            align: function (context: Context) {
                return getSmartLabelAlign(context)
            },
            anchor: function (context: Context) {
                return getSmartLabelAnchor(context)
            },
            color: isDark.value ? chartColors.datalabels.dark : chartColors.datalabels.light,
            font: {
                weight: 'bold',
            },
            formatter: (value: number) => value.toFixed(2),
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: { color: isDark.value ? '#444' : '#e5e7eb' },
            ticks: { color: isDark.value ? '#fff' : '#222' },
        },
        x: {
            grid: { color: isDark.value ? '#444' : '#e5e7eb' },
            ticks: { color: isDark.value ? '#fff' : '#222' },
        },
    },
    backgroundColor: isDark.value ? '#18181b' : '#fff',
}))
</script>
