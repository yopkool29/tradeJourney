<template>
    <UCard class="h-full" :ui="{ header: 'p-0' }">
        <template #header>
            <div class="flex items-center gap-2 w-full">
                <span class="font-semibold">{{ $t('components.dashboard.appt_chart.title') }}</span>
                <button
                    class="ml-auto px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
                    :title="$t('components.dashboard.appt_chart.enlarge')"
                    @click="isModalOpen = true"
                >
                    <UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
                </button>
                <CommonModalChart v-model="isModalOpen" :title="$t('components.dashboard.appt_chart.enlarged_title')">
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
import type { Context } from 'chartjs-plugin-datalabels'
import { useUserStore } from '~/stores/user'
import { generateApptChartData } from '~/utils/dashboard'
import type { TooltipItem, ChartTypeRegistry } from 'chart.js'

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
    const data = generateApptChartData(
        userStore.dashBoardFilters.last_results,
        userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year'
    )

    // Appliquer les couleurs et options depuis la configuration
    if (data.datasets && data.datasets.length > 1) {
        // Configuration pour la ligne de moyenne mobile (premier dataset)
        data.datasets[0].borderColor = isDark.value ? chartColors.apptChart.movingAverage.dark : chartColors.apptChart.movingAverage.light
        data.datasets[0].pointBackgroundColor = isDark.value ? chartColors.apptChart.movingAverage.dark : chartColors.apptChart.movingAverage.light
        data.datasets[0].pointRadius = chartConfigOptions.pointRadius
        data.datasets[0].label = t('components.dashboard.index.mobile_avg_label')


        // Configuration pour les barres d'APPT (deuxième dataset)
        data.datasets[1].backgroundColor = isDark.value ? chartColors.apptChart.bar.dark : chartColors.apptChart.bar.light
        data.datasets[1].borderRadius = chartConfigOptions.borderRadius
        data.datasets[1].barPercentage = chartConfigOptions.barPercentage
    }
    return data
})

const chartDisplayOptions = computed(() => ({
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
            callbacks: {
                label: function (context: TooltipItem<keyof ChartTypeRegistry>) {
                    return context.dataset.label + ': ' + formatCurrency(context.parsed.y)
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
}))

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
