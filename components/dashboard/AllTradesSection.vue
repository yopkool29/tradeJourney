<template>
    <UCard class="h-full">
        <template #header>
            <h3 class="section-title-semibold">{{ $t('components.dashboard.all_trades.title') }}</h3>
        </template>
        
        <div class="space-y-3 text-sm">
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.all_trades.gross_pnl') }}:</span>
                <span class="font-semibold" :class="result.grossPnl >= 0 ? 'profit-text' : 'loss-text'">
                    {{ formatCurrency(result.grossPnl) }}
                </span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.all_trades.trades_count') }}:</span>
                <span class="font-semibold">{{ result.tradesCount }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.all_trades.contracts') }}:</span>
                <span class="font-semibold">{{ result.totalContracts }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.all_trades.avg_trade_time') }}:</span>
                <span class="font-semibold">{{ formatDurationMinutes(result.avgTradeDuration) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.all_trades.longest_trade_time') }}:</span>
                <span class="font-semibold">{{ formatDurationMinutes(result.maxTradeDuration) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.all_trades.profitable_trades') }}:</span>
                <span class="font-semibold">{{ result.winrate?.toFixed(2) }}%</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.all_trades.expectancy') }}:</span>
                <span class="font-semibold" :class="result.expectancy >= 0 ? 'profit-text' : 'loss-text'">
                    {{ formatCurrency(result.expectancy) }}
                </span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.all_trades.commission') }}:</span>
                <span class="font-semibold">
                    {{ formatCurrency(result.totalCommission) }}
                </span>
            </div>
            
            <div class="flex justify-between border-t pt-3 mt-3">
                <span class="text-secondary font-medium">{{ $t('components.dashboard.all_trades.total_pnl') }}:</span>
                <span class="font-bold text-base" :class="result.pnl >= 0 ? 'profit-text' : 'loss-text'">
                    {{ formatCurrency(result.pnl) }}
                </span>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { formatDurationMinutes } from '~/utils/date-utils'

const { formatCurrency } = useUtils()

const userStore = useUserStore()
const result = computed(() => userStore.dashBoardResult)
</script>
