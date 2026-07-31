<template>
    <UCard class="h-full">
        <template #header>
            <h3 class="section-title-semibold">{{ $t('components.dashboard.risk_ratios.title') }}</h3>
        </template>

        <div class="space-y-2 text-sm">
            <!-- Profit Factor -->
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.risk_ratios.profit_factor') }}</span>
                <span class="font-semibold">{{ formatNumberValue(result.profitFactor) }}</span>
            </div>

            <!-- P/L Ratio -->
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.risk_ratios.pl_ratio') }}</span>
                <span class="font-semibold">{{ formatNumberValue(result.plRatio) }}</span>
            </div>

            <!-- Recovery Factor -->
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.risk_ratios.recovery_factor') }}</span>
                <span class="font-semibold">{{ formatNumberValue(result.recoveryFactor) }}</span>
            </div>

            <!-- Sharpe Ratio -->
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.risk_ratios.sharpe_ratio') }}</span>
                <span class="font-semibold">{{ formatNumberValue(result.sharpeRatio) }}</span>
            </div>

            <!-- Sortino Ratio -->
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.risk_ratios.sortino_ratio') }}</span>
                <span class="font-semibold">{{ formatNumberValue(result.sortinoRatio) }}</span>
            </div>

            <!-- Calmar Ratio -->
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.risk_ratios.calmar_ratio') }}</span>
                <span class="font-semibold">{{ formatNumberValue(result.calmarRatio) }}</span>
            </div>

            <!-- SQN (Van Tharp) — nécessite R-multiples -->
            <div v-if="result.tradesWithRMultiple > 0" class="flex justify-between border-t pt-2">
                <span class="text-secondary">{{ $t('components.dashboard.risk_ratios.sqn') }}</span>
                <span class="font-semibold">{{ formatNumberValue(result.sqn) }}</span>
            </div>

            <!-- Ulcer Index -->
            <div class="flex justify-between" :class="{ 'border-t pt-2': result.tradesWithRMultiple === 0 }">
                <span class="text-secondary">{{ $t('components.dashboard.risk_ratios.ulcer_index') }}</span>
                <span class="font-semibold">{{ formatNumberValue(result.ulcerIndex) }}</span>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { formatNumberValue } from '~/utils/formatNumberValue'

const { dashBoardResult: result } = useDashboard()
</script>
