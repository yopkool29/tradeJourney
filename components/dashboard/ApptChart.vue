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
                        <Bar ref="modalBarChartRef" :key="`appt-chart-modal-${displayModeNet}`" :data="chartData" :options="chartDisplayOptions" style="width: 100%; height: 100%" />
                    </template>
                </CommonModalChart>
            </div>
        </template>
        <div :style="`width: 100%; height: ${canvasHeight}px`" style="cursor: pointer;">
            <Bar
                ref="barChartRef"
                :key="`appt-chart-${displayModeNet}`"
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
import { useUserStore } from '~/stores/user'
import { generateApptChartData } from '~/utils/dashboard'
import type { TooltipItem, ChartTypeRegistry } from 'chart.js'
import { defaultSettings } from '~/schema/user'

const { formatCurrency } = useUtils()

const barChartRef = ref()
const isModalOpen = ref(false)
const modalBarChartRef = ref()
const userStore = useUserStore()
const { displayModeNet } = useNetGrossDisplay()

const { t } = useI18n()

// Récupérer la configuration des graphiques
const appConfig = useAppConfig()
const chartConfigOptions = appConfig.charts.options

const canvasHeight = computed(() => chartConfigOptions.canvasHeight)

const { movingAverageColor, isDark, profitColor, lossColor } = useTypeColors('apptChart')

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
    const data = generateApptChartData(
        userStore.dashBoardFilters.last_results,
        userStore.dashBoardFilters.cumuleMode as 'day' | 'week' | 'month' | 'year',
        5,
        displayModeNet.value
    )

    // Appliquer les couleurs et options depuis la configuration
    if (data.datasets && data.datasets.length > 1) {
        // Configuration pour la ligne de moyenne mobile (premier dataset)
        data.datasets[0].borderColor = movingAverageColor.value
        data.datasets[0].pointBackgroundColor = movingAverageColor.value
        data.datasets[0].pointRadius = chartConfigOptions.pointRadius
        data.datasets[0].label = t('components.dashboard.index.mobile_avg_label')

        // Configuration pour les barres d'APPT (deuxième dataset) - couleurs profit/loss
        const apptData = data.datasets[1].data as number[]
        data.datasets[1].backgroundColor = apptData.map(value =>
            value >= 0 ? profitColor.value : lossColor.value
        )
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
                return datalabelsSettings.value.display
            },
            // Positionnement intelligent en fonction de la valeur et des limites du graphique
            align: function (context: Context) {
                return getSmartLabelAlign(context)
            },
            anchor: function (context: Context) {
                return getSmartLabelAnchor(context)
            },
            color: datalabelsSettings.value.color,
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
                callback: (value) => formatCurrency(Number(value)),
            },
        },
        x: {
            grid: { color: isDark.value ? '#444' : '#e5e7eb' },
        },
    },
    backgroundColor: isDark.value ? '#18181b' : '#fff',
}))
</script>
