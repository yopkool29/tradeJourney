<template>
    <div class="w-full h-48 relative">
        <canvas ref="chartCanvas"></canvas>
    </div>
</template>

<script setup lang="ts">
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js'
import { getBodyTextColor } from '@/utils/color-utils'

Chart.register(ArcElement, Tooltip, Legend)

const userStore = useDataStore()
const { t } = useI18n()
const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const { profitColor, lossColor, breakevenColor, isDark } = useTypeColors()

const borderColor = computed(() => isDark.value ? '#1f2937' : '#ffffff')

const totalTrades = computed(() => {
    const result = userStore.dashboardResult
    return result.winningTradesCount + result.breakevenTradesCount + result.losingTradesCount
})

const chartData = computed(() => {
    const result = userStore.dashboardResult
 
    return {
        labels: [t('components.dashboard.all_trades.winning'), t('components.dashboard.all_trades.breakeven'), t('components.dashboard.all_trades.losing')],
        datasets: [{
            data: [
                result.winningTradesCount,
                result.breakevenTradesCount || "",
                result.losingTradesCount
            ],
            backgroundColor: [
                profitColor.value,
                breakevenColor.value,
                lossColor.value
            ],
            borderWidth: 2,
            borderColor: borderColor.value,
            hoverOffset: 4
        }]
    }
})

const getChartFontFamily = (chart: Chart) => {
    const parent = chart.canvas.parentElement
    return parent ? getComputedStyle(parent).fontFamily : 'sans-serif'
}

const labelColor = computed(() => {
    isDark.value
    return getBodyTextColor()
})

const centerTextPlugin = {
    id: 'centerText',
    beforeDraw(chart: Chart) {
        const { ctx, width, height } = chart
        const total = totalTrades.value
        const fontFamily = getChartFontFamily(chart)

        ctx.save()
        ctx.font = `bold 18px ${fontFamily}`
        ctx.fillStyle = labelColor.value
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(total.toString(), width / 2, height / 2)
        ctx.restore()
    }
}

const dataLabelsPlugin = {
    id: 'dataLabels',
    afterDraw(chart: Chart) {
        const { ctx } = chart
        const fontFamily = getChartFontFamily(chart)
        const meta = chart.getDatasetMeta(0)

        ctx.save()
        ctx.font = `bold 12px ${fontFamily}`
        ctx.fillStyle = labelColor.value
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        meta.data.forEach((arc, index) => {
            const value = Number(chartData.value.datasets[0].data[index])
            if (!value || value === 0) return

            const center = arc.getCenterPoint()
            ctx.fillText(value.toString(), center.x, center.y)
        })

        ctx.restore()
    }
}

const updateChart = () => {
    if (!chartCanvas.value) return

    if (chartInstance) {
        chartInstance.data = chartData.value
        chartInstance.update()
    } else {
        chartInstance = new Chart(chartCanvas.value, {
            type: 'doughnut',
            data: chartData.value,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                console.log(context)
                                const label = context.label || ''
                                const value = context.parsed as number || 0
                                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0)
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                                return `${label}: ${value} (${percentage}%)`
                            }
                        }
                    }
                }
            },
            plugins: [centerTextPlugin, dataLabelsPlugin]
        })
    }
}

watch(() => chartData.value, updateChart, { deep: true })

onMounted(() => {
    updateChart()
})

onUnmounted(() => {
    if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
    }
})
</script>
