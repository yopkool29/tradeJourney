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
                        <Bar ref="modalBarChartRef" :key="`winrate-chart-modal-${displayModeNet}`" :data="chartData" :options="chartDisplayOptions" style="width: 100%; height: 100%" />
                    </template>
                </CommonModalChart>
            </div>
        </template>
        <div class="relative" :style="`width: 100%; height: ${canvasHeight}px`" style="cursor: crosshair;">
            <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 z-10 rounded">
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
            </div>
            <Bar
                ref="barChartRef"
                :key="`winrate-chart-${displayModeNet}`"
                :data="chartData"
                :options="chartDisplayOptions"
                @click="isModalOpen = true"
            />
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions, TooltipItem, ChartTypeRegistry } from 'chart.js'
import { useUserStore } from '~/stores/user'
import { generateWinrateChartData, getSmartLabelAlign, getSmartLabelAnchor } from '~/utils/dashboard'
import { defaultSettings } from '~/schema/user'

const props = defineProps<{
    loading?: boolean
}>()

const barChartRef = ref()
const isModalOpen = ref(false)
const modalBarChartRef = ref()
const userStore = useUserStore()
const dataStore = useDataStore()
const { displayModeNet } = useNetGrossDisplay()
const { t } = useI18n()

// Récupérer la configuration des graphiques
const appConfig = useAppConfig()
const chartConfigOptions = appConfig.charts.options

const canvasHeight = computed(() => chartConfigOptions.canvasHeight)

const { barColor, movingAverageColor, isDark } = useTypeColors('winrateChart')

const colorMode = useColorMode()
const datalabelsSettings = computed(() => {
	const colors = userStore.user?.settings_object?.chartColors?.datalabels || defaultSettings.chartColors!.datalabels
	const theme = colorMode.value as 'light' | 'dark' | 'light-blue' | 'dark-gold'
	return {
		display: colors.display,
		color: colors[theme] || colors.light,
	}
})

// Données du graphique calculées à partir des trades stockés dans le store
const chartData = computed(() => {
    const data = generateWinrateChartData(
        dataStore.lastTrades,
        userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year',
        3, // fenêtre de moyenne mobile
        displayModeNet.value
    )

    // Personnaliser les couleurs et options pour chaque dataset
    if (data.datasets && data.datasets.length > 1) {
        // Barres winrate
        data.datasets[1].backgroundColor = barColor.value ?? ''
        data.datasets[1].borderRadius = chartConfigOptions.borderRadius
        data.datasets[1].barPercentage = chartConfigOptions.barPercentage

        // Ligne moyenne mobile
        data.datasets[0].borderColor = movingAverageColor.value ?? ''
        data.datasets[0].backgroundColor = movingAverageColor.value ?? ''
        data.datasets[0].pointBackgroundColor = movingAverageColor.value ?? ''
        data.datasets[0].pointRadius = chartConfigOptions.pointRadius
        data.datasets[0].label = t('components.dashboard.index.mobile_avg_label')
    }

    return data as ChartData<'bar'>
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
                            const value = context.parsed.y!
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
                        return datalabelsSettings.value.display
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
                    color: datalabelsSettings.value.color,
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
        }) as ChartOptions<"bar">
)
</script>
