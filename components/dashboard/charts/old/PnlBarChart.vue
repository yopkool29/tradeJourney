<template>
    <DashboardChartsBaseChartjsCard :title="$t('components.dashboard.pnl_bar_chart.title')"
        :enlarged-title="$t('components.dashboard.pnl_bar_chart.enlarged_title')" :canvas-height="canvasHeight"
        :loading="loading">
        <Bar ref="barChartRef" :key="`pnl-chart-${displayModeNet}-${props.layoutKey ?? 0}`" :data="chartData"
            :options="chartOptions" />
        <template #modal>
            <Bar :key="`pnl-chart-modal-${displayModeNet}`" :data="chartData" :options="chartOptions"
                style="width: 100%; height: 100%; cursor: crosshair" />
        </template>
    </DashboardChartsBaseChartjsCard>
</template>

<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import type { TooltipItem } from 'chart.js'
import type { TradeExtendedType } from '~/schema/trade'
import { formatDateWithUserTimezone } from '~/utils/date-utils'

const props = defineProps<{
    loading?: boolean
    layoutKey?: number
}>()

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { locale } = useI18n()

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const userStore = useUserStore()
const appConfig = useAppConfig()
const { profitColor, lossColor, isDark } = useTypeColors('pnlBarChart')

const chartConfigOptions = appConfig.charts.options
const canvasHeight = computed(() => chartConfigOptions.canvasHeight)

const { profitColor: profitColor2, lossColor: lossColor2, breakevenColor } = useTypeColors()

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
    interaction: {
        mode: 'index' as const,
        intersect: false,
    },
    plugins: {
        legend: {
            display: false
        },
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
                enabled: true,
            },
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
