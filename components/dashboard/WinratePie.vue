<template>
    <Pie ref="pieChartRef" :data="chartData" :options="chartOptions" :plugins="[centerTextPlugin]" />
</template>

<script setup lang="ts">
import { Pie } from 'vue-chartjs'
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js'
import type { ChartOptions } from 'chart.js'

const props = defineProps<{ value: number }>()

const pieChartRef = ref()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const appConfig = useAppConfig()

Chart.register(ArcElement, Tooltip, Legend)

const chartColors = appConfig.charts.colors

const chartData = computed(() => ({
    labels: ['', ''], // Labels vides pour ne pas afficher de texte
    datasets: [
        {
            data: [Math.round(props.value * 100), 100 - Math.round(props.value * 100)],
            backgroundColor: [
                isDark.value ? chartColors.pie.win.dark : chartColors.pie.win.light,
                isDark.value ? chartColors.pie.loss.dark : chartColors.pie.loss.light,
            ],
            hoverOffset: 4,
            borderWidth: 0,
            circumference: 360, // 180 degrés pour un demi-cercle
            rotation: -90, // Commencer à minuit
        },
    ],
}))

// Plugin simple pour afficher le texte au centre
const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
        try {
            const { ctx, chartArea } = chart
            if (!chartArea) return

            const centerX = (chartArea.left + chartArea.right) / 2
            const centerY = (chartArea.top + chartArea.bottom) / 2

            ctx.save()
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = isDark.value ? '#333' : '#333'
            ctx.font = 'bold 14px Arial'
            ctx.fillText(`${Math.round(props.value * 100)}%`, centerX, centerY)
            ctx.restore()
        } catch (e) {
            console.error('Error in centerTextPlugin:', e)
        }
    },
}

const chartOptions = computed(() => ({
    plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: {
            display: false, // Désactiver les datalabels si présents
        },
    },
})) as ChartOptions

function handleResize() {
    if (pieChartRef.value && pieChartRef.value.chart) {
        pieChartRef.value.chart.resize()
    }
}

onMounted(() => {
    window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
    // Nettoyage des événements et du canvas
    window.removeEventListener('resize', handleResize)
})
</script>
