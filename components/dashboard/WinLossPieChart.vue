<template>
    <div class="w-full h-48">
        <canvas ref="chartCanvas"></canvas>
    </div>
</template>

<script setup lang="ts">
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js'
import { defaultSettings } from '~/schema/user'

Chart.register(ArcElement, Tooltip, Legend)

const userStore = useDataStore()
const { t } = useI18n()
const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const { profitColor, lossColor, breakevenColor } = useTypeColors()

const chartData = computed(() => {
    const result = userStore.dashboardResult
    
    return {
        labels: [t('components.dashboard.all_trades.winning'), t('components.dashboard.all_trades.breakeven'), t('components.dashboard.all_trades.losing')],
        datasets: [{
            data: [
                result.winningTradesCount,
                result.breakevenTradesCount,
                result.losingTradesCount
            ],
            backgroundColor: [
                profitColor.value,
                breakevenColor.value,
                lossColor.value
            ],
            borderWidth: 0
        }]
    }
})

const updateChart = () => {
    if (!chartCanvas.value) return
    
    if (chartInstance) {
        chartInstance.data = chartData.value
        chartInstance.update()
    } else {
        chartInstance = new Chart(chartCanvas.value, {
            type: 'pie',
            data: chartData.value,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || ''
                                const value = context.parsed || 0
                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                                return `${label}: ${value} (${percentage}%)`
                            }
                        }
                    }
                }
            }
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
