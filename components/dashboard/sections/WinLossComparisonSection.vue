<template>
    <UCard class="h-full">
        <template #header>
            <h3 class="section-title-semibold">{{ $t('components.dashboard.comparison.title') }}</h3>
        </template>
        
        <div class="space-y-4">
            <!-- Pie Chart -->
            
            <div class="flex justify-center">
                <component :is="pieChartComponent" />
            </div>
            
            <!-- Légende avec pourcentages -->
            <div class="space-y-2 text-sm">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-green-500"></div>
                        <span class="text-secondary">{{ $t('components.dashboard.comparison.winning_trades') }}</span>
                    </div>
                    <span class="font-semibold">{{ winningPercentage }}%</span>
                </div>
                
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full" :class="$colorMode.value === 'dark' ? 'bg-amber-400' : 'bg-gray-400'"></div>
                        <span class="text-secondary">{{ $t('components.dashboard.comparison.breakeven_trades') }}</span>
                    </div>
                    <span class="font-semibold">{{ breakevenPercentage }}%</span>
                </div>
                
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-red-500"></div>
                        <span class="text-secondary">{{ $t('components.dashboard.comparison.losing_trades') }}</span>
                    </div>
                    <span class="font-semibold">{{ losingPercentage }}%</span>
                </div>
            </div>
            
            <!-- Stats supplémentaires -->
            <!-- Profit Factor, P/L Ratio, Recovery Factor, Sharpe déplacés vers RiskRatiosSection.vue -->
        </div>
    </UCard>
</template>

<script setup lang="ts">
const appConfig = useAppConfig() as { charts?: { chartjs?: boolean } }
const pieChartComponent = computed(() =>
    appConfig.charts?.chartjs === true
        ? resolveComponent('DashboardChartsOldWinLossPieChart')
        : resolveComponent('DashboardChartsMainWinLossPieChartEcharts')
)

const { dashBoardResult: result } = useDashboard()

const winningPercentage = computed(() => {
    const total = result.value.tradesCount
    if (total === 0) return 0
    return ((result.value.winningTradesCount / total) * 100).toFixed(1)
})

const losingPercentage = computed(() => {
    const total = result.value.tradesCount
    if (total === 0) return 0
    return ((result.value.losingTradesCount / total) * 100).toFixed(1)
})

const breakevenPercentage = computed(() => {
    const total = result.value.tradesCount
    if (total === 0) return 0
    return ((result.value.breakevenTradesCount / total) * 100).toFixed(1)
})
</script>
