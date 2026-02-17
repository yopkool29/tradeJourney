<template>
    <UCard class="h-full" :ui="{ header: 'p-0' }">
        <template #header>
            <div class="flex items-center gap-2 w-full">
                <span class="font-semibold">{{ $t('components.dashboard.pnl_bar_chart.title') }}</span>
                <button
                    class="ml-auto px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
                    :title="$t('components.dashboard.pnl_bar_chart.enlarge')"
                    @click="isModalOpen = true"
                >
                    <UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
                </button>
                <CommonModalChart v-model="isModalOpen" :title="$t('components.dashboard.pnl_bar_chart.enlarged_title')">
                    <template #content>
                        <canvas ref="modalChartCanvas" style="width: 100%; height: 100%"></canvas>
                    </template>
                </CommonModalChart>
            </div>
        </template>
        <div class="w-full" :style="{ height: `${canvasHeight}px` }" style="cursor: pointer;" @click="isModalOpen = true">
            <canvas ref="chartCanvas"></canvas>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { defaultSettings } from '~/schema/user'
import type { TradeExtendedType } from '~/schema/trade'
import { formatDateWithUserTimezone } from '~/utils/date-utils'

const { formatCurrency } = useUtils()
const { locale } = useI18n()

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const userStore = useUserStore()
const chartCanvas = ref<HTMLCanvasElement | null>(null)
const modalChartCanvas = ref<HTMLCanvasElement | null>(null)
const isModalOpen = ref(false)
let chartInstance: Chart | null = null
let modalChartInstance: Chart | null = null

const appConfig = useAppConfig()
const chartConfigOptions = appConfig.charts.options

const canvasHeight = computed(() => chartConfigOptions.canvasHeight)

const { profitColor, lossColor, breakevenColor } = useTypeColors()

const chartData = computed(() => {
    const trades: TradeExtendedType[] = userStore.dashBoardFilters.last_results
    const sortedTrades = [...trades].sort((a, b) => {
        const aClose = a.closeDate ? new Date(a.closeDate).getTime() : 0
        const bClose = b.closeDate ? new Date(b.closeDate).getTime() : 0
        if (aClose !== bClose) return aClose - bClose
        const aOpen = a.openDate ? new Date(a.openDate).getTime() : 0
        const bOpen = b.openDate ? new Date(b.openDate).getTime() : 0
        if (aOpen !== bOpen) return aOpen - bOpen
        return (a.id || 0) - (b.id || 0)
    })
    const appConfig = useAppConfig()
    const maxTrades = appConfig.charts?.options?.pnlBarChart?.maxTrades || 50
    
    // Afficher les derniers trades du plus ancien (gauche) au plus récent (droite)
    const displayTrades = sortedTrades.slice(-maxTrades)
    
    return {
        labels: displayTrades.map((_, index) => `#${index + 1}`),
        datasets: [{
            label: '',
            data: displayTrades.map(trade => trade.profit),
            trades: displayTrades, // Stocker les trades pour accès dans le tooltip
            backgroundColor: displayTrades.map(trade => 
                trade.profit > 0 ? profitColor.value : 
                trade.profit < 0 ? lossColor.value : 
                breakevenColor.value
            ),
            borderColor: displayTrades.map(trade => 
                trade.profit > 0 ? profitColor.value.replace('0.8', '1') : 
                trade.profit < 0 ? lossColor.value.replace('0.8', '1') : 
                breakevenColor.value.replace('0.8', '1')
            ),
            borderWidth: 1,
            borderRadius: chartConfigOptions.borderRadius
        }]
    }
})

const getChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            callbacks: {
                label: (context) => {
                    const value = context.parsed.y
                    const trade = context.dataset.trades?.[context.dataIndex]
                    let date = ''
                    if (trade?.closeDate) {
                        date = formatDateWithUserTimezone(
                            trade.closeDate,
                            userStore.user?.settings_object || {},
                            true,
                            locale.value as 'fr' | 'en' | 'us'
                        )
                    }
                    return [
                        date ? `Date: ${date}` : '',
                        `P&L: ${formatCurrency(value)}`,
                        trade?.account_displayName ? `${trade.account_displayName}` : ''
                    ].filter(Boolean)
                }
            }
        },
        datalabels: {
            display: false
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(156, 163, 175, 0.2)'
            },
            ticks: {
                callback: (value) => formatCurrency(Number(value))
            }
        },
        x: {
            grid: {
                display: false
            }
        }
    }
})

const updateChart = () => {
    if (!chartCanvas.value) return
    
    if (chartInstance) {
        chartInstance.data = chartData.value
        chartInstance.update()
    } else {
        chartInstance = new Chart(chartCanvas.value, {
            type: 'bar',
            data: chartData.value,
            options: getChartOptions()
        })
    }
}

const updateModalChart = () => {
    if (!modalChartCanvas.value) return
    
    if (modalChartInstance) {
        modalChartInstance.data = chartData.value
        modalChartInstance.update()
    } else {
        modalChartInstance = new Chart(modalChartCanvas.value, {
            type: 'bar',
            data: chartData.value,
            options: getChartOptions()
        })
    }
}

watch(() => chartData.value, () => {
    updateChart()
    if (isModalOpen.value && modalChartCanvas.value) {
        updateModalChart()
    }
}, { deep: true })

watch(isModalOpen, (newVal) => {
    if (newVal) {
        nextTick(() => {
            updateModalChart()
        })
    } else {
        // Détruire le graphique modal à la fermeture pour permettre de le recréer
        if (modalChartInstance) {
            modalChartInstance.destroy()
            modalChartInstance = null
        }
    }
})

onMounted(() => {
    updateChart()
})

onUnmounted(() => {
    if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
    }
    if (modalChartInstance) {
        modalChartInstance.destroy()
        modalChartInstance = null
    }
})
</script>
