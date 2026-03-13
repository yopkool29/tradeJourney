<template>
    <UCard class="h-full">
        <template #header>
            <h3 class="section-title-semibold text-green-600 dark:text-green-400">
                {{ $t('components.dashboard.profit_trades.title') }}
            </h3>
        </template>
        
        <div class="space-y-3 text-sm">
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.total_profit') }}:</span>
                <span class="font-semibold profit-text">{{ formatCurrency(result.totalProfit) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.winning_trades') }}:</span>
                <span class="font-semibold">{{ result.winningTradesCount }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.winning_contracts') }}:</span>
                <span class="font-semibold">{{ result.winningContractsCount }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.largest_win') }}:</span>
                <span class="font-semibold profit-text">{{ formatCurrency(result.largestWin) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.avg_win') }}:</span>
                <span class="font-semibold">{{ formatCurrency(result.avgWin) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.std_dev') }}:</span>
                <span class="font-semibold">{{ formatCurrency(result.stdDevWin) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.commission') }}:</span>
                <span class="font-semibold">{{ formatCurrency(result.winningTradesCommission) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.avg_win_time') }}:</span>
                <span class="font-semibold">{{ formatDurationMinutes(result.avgWinDuration) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.longest_win_time') }}:</span>
                <span class="font-semibold">{{ formatDurationMinutes(result.maxWinDuration) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.max_winning_streak') }}:</span>
                <span class="font-semibold profit-text">{{ result.maxWinningStreak }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.max_run_up') }}:</span>
                <span class="font-semibold profit-text">{{ formatCurrency(result.maxRunUp) }}</span>
            </div>
            
            <div v-if="maxRunUpDisplayDates.start" class="flex justify-between text-xs">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.max_run_up_from') }}:</span>
                <span>{{ formatDateWithFallback(maxRunUpDisplayDates.start) }}</span>
            </div>
            
            <div v-if="maxRunUpDisplayDates.end" class="flex justify-between text-xs">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.max_run_up_to') }}:</span>
                <span>{{ formatDateWithFallback(maxRunUpDisplayDates.end) }}</span>
            </div>
            
            <div v-if="result.largestWinDate" class="flex justify-between text-xs">
                <span class="text-secondary">{{ $t('components.dashboard.profit_trades.largest_win_date') }}:</span>
                <span>{{ formatDateWithFallback(result.largestWinDate) }}</span>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { formatDurationMinutes, formatDateWithUserTimezone } from '~/utils/date-utils'

const { formatCurrency } = useUtils()

const { locale } = useI18n()
const userStore = useUserStore()
const result = computed(() => userStore.dashBoardResult)

const maxRunUpDisplayDates = computed(() => {
    const from = result.value.maxRunUpDateFrom ? new Date(result.value.maxRunUpDateFrom) : null
    const to = result.value.maxRunUpDateTo ? new Date(result.value.maxRunUpDateTo) : null

    if (from && to && from > to) {
        return { start: to, end: from }
    }

    return { start: from, end: to }
})

// Clé réactive pour forcer le re-rendu quand les settings de timezone changent
const timezoneKey = computed(() => {
    const settings = userStore.user?.settings_object
    return `${settings?.timezoneDisplay}-${settings?.timezoneLocal}-${settings?.timezoneUtcOffset}`
})

const formatDateWithFallback = (date: Date | null): string => {
    // Référence pour rendre la fonction réactive aux changements de timezone
    void timezoneKey.value

    if (!date) return '—'
    return formatDateWithUserTimezone(date, userStore.user?.settings_object, true, locale.value as 'fr' | 'en' | 'us')
}
</script>
