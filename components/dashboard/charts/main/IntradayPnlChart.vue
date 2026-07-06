<template>
    <div class="w-full h-full min-h-[60px] relative">
        <Line ref="lineChartRef" :data="chartData" :options="chartOptions" :width="chartWidth" :height="chartHeight" class="w-full h-full" />
    </div>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'
import type { Chart, ChartData, ChartOptions, TooltipItem } from 'chart.js'
import { formatHourString } from '~/utils/date-utils'
import { defaultSettings } from '~/schema/user'

const { formatCurrency } = useUtils()
const { t } = useI18n()

const userStore = useUserStore()
const { locale } = useI18n()

const props = defineProps<{
    chartData: Array<{ count: number; pnl: number; date: string }>
    height?: number
    width?: number
}>()

const colorMode = useColorMode()

const pnlchartColors = computed(() => {
	const colors = defaultSettings.chartColors!.pnlchart
	const theme = colorMode.value as 'light' | 'dark' | 'light-blue' | 'dark-gold'
    return {
		line: colors.line[theme],
		point: colors.point[theme],
	}
})

// Dimensions du graphique
const lineChartRef = ref<{ chart: Chart<'line'> } | null>(null)

const chartWidth = computed(() => props.width || 120)
const chartHeight = computed(() => props.height || 60)

// Formatage des données pour Chart.js
const chartData = computed<ChartData<'line'>>(() => {
    if (!props.chartData || !Array.isArray(props.chartData) || props.chartData.length === 0) {
        return {
            labels: [],
            datasets: [
                {
                    label: t('components.dashboard.intraday_pnl_chart.label'),
                    data: [],
                    fill: false,
                },
            ],
        }
    }

    return {
        labels: props.chartData.map((point) => point.count),
        datasets: [
            {
                label: t('components.dashboard.intraday_pnl_chart.label'),
                data: props.chartData.map((point) => point.pnl),
                fill: false,
            },
        ],
    }
})

// Options du graphique - version simplifiée avec uniquement la ligne
const chartOptions = computed<ChartOptions<'line'>>(() => ({
    legend: {
        display: false,
    },
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    interaction: { mode: 'nearest', intersect: false },
    elements: {
        line: {
            borderWidth: 2,
            borderColor: pnlchartColors.value.line,
            tension: 0.4,
        },
        point: {
            radius: 1,
            borderColor: pnlchartColors.value.point,
            hoverRadius: 0,
        },
    },
    plugins: {
        legend: { display: false },
        crosshair: {
            line: {
                color: colorMode.value === 'dark' || colorMode.value === 'dark-gold' ? '#888' : '#222',
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
            displayColors: false,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            callbacks: {
                title: () => '',
                label: (context: TooltipItem<'line'>) => {
                    const labelIdx = context.label != null ? parseInt(context.label) : NaN
                    const date = props.chartData[labelIdx]?.date
                    if (date) {
                        const formatted = formatHourString(date, false, locale.value as 'fr' | 'en' | 'us', userStore.user?.settings_object?.timezoneDisplay, userStore.user?.settings_object?.timezoneLocal, userStore.user?.settings_object?.timezoneUtcOffset)
                        return [formatted ?? '', context.dataset.label + ': ' + formatCurrency(context.parsed.y ?? 0)]
                    } else return [context.dataset.label + ': ' + formatCurrency(context.parsed.y ?? 0)]
                },
            },
        },
        datalabels: {
            display: false,
        },
    },
    scales: {
        x: { display: false },
        y: { display: false },
    },
}))

const handleResize = () => {
    if (lineChartRef.value && lineChartRef.value.chart) {
        lineChartRef.value.chart.resize()
    }
}

onMounted(() => {
    window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
    // Nettoyage des événements
    window.removeEventListener('resize', handleResize)

    // Détruire les instances de graphique
    const charts = [lineChartRef.value]
    charts.forEach((chartRef) => {
        if (chartRef?.chart) {
            chartRef.chart.destroy()
        }
    })
})
</script>
