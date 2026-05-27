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
                        <Bar :key="`pnl-chart-modal-${displayModeNet}`" :data="chartData" :options="chartOptions" style="width: 100%; height: 100%" />
                    </template>
                </CommonModalChart>
            </div>
        </template>
        <div class="relative w-full" :style="{ height: `${canvasHeight}px` }" style="cursor: pointer;" @click="isModalOpen = true">
            <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 z-10 rounded">
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
            </div>
            <Bar ref="barChartRef" :key="`pnl-chart-${displayModeNet}`" :data="chartData" :options="chartOptions" />
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import type { TooltipItem } from 'chart.js'
import type { TradeExtendedType } from '~/schema/trade'
import { formatDateWithUserTimezone } from '~/utils/date-utils'

const props = defineProps<{
    loading?: boolean
}>()

const { displayModeNet } = useNetGrossDisplay()

const { formatCurrency } = useUtils()
const { locale } = useI18n()

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const userStore = useUserStore()
const barChartRef = ref()
const isModalOpen = ref(false)

const appConfig = useAppConfig()
const chartConfigOptions = appConfig.charts.options

const canvasHeight = computed(() => chartConfigOptions.canvasHeight)

const { profitColor, lossColor, breakevenColor } = useTypeColors()

const dataStore = useDataStore()

const chartData = computed(() => {
    const trades: TradeExtendedType[] = dataStore.lastTrades
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
            data: displayTrades.map(trade => displayModeNet.value ? trade.netProfit : trade.profit),
            trades: displayTrades, // Stocker les trades pour accès dans le tooltip
            backgroundColor: displayTrades.map(trade => {
                const value = displayModeNet.value ? trade.netProfit : trade.profit
                return value > 0 ? profitColor.value : 
                       value < 0 ? lossColor.value : 
                       breakevenColor.value
            }),
            borderColor: displayTrades.map(trade => {
                const value = displayModeNet.value ? trade.netProfit : trade.profit
                return value > 0 ? profitColor.value.replace('0.8', '1') : 
                       value < 0 ? lossColor.value.replace('0.8', '1') : 
                       breakevenColor.value.replace('0.8', '1')
            }),
            borderWidth: 1,
            borderRadius: chartConfigOptions.borderRadius
        }]
    }
})

const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 200
    },
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            callbacks: {
                label: (context: TooltipItem<'bar'>) => {
                    const value = context.parsed.y ?? 0
                    const trade = (context.dataset as any).trades?.[context.dataIndex] as TradeExtendedType | undefined
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
                callback: (value: string | number) => formatCurrency(Number(value))
            }
        },
        x: {
            grid: {
                display: false
            }
        }
    }
}))
</script>
