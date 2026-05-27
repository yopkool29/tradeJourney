<template>
    <UCard class="h-full">
        <template #header>
            <h3 class="section-title-semibold text-red-600 dark:text-red-400">
                {{ $t('components.dashboard.losing_trades.title') }}
            </h3>
        </template>
        
        <div class="space-y-3 text-sm">
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.total_loss') }}:</span>
                <span class="font-semibold" :class="result.totalLoss !== 0 ? 'loss-text' : ''">{{ formatLossValue(result.totalLoss) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.losing_trades') }}:</span>
                <span class="font-semibold">{{ result.losingTradesCount }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.losing_contracts') }}:</span>
                <span class="font-semibold">{{ result.losingContractsCount }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.largest_loss') }}:</span>
                <span class="font-semibold" :class="result.largestLoss !== 0 ? 'loss-text' : ''">{{ formatLossValue(result.largestLoss) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.avg_loss') }}:</span>
                <span class="font-semibold">{{ formatLossValue(result.avgLoss) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.std_dev') }}:</span>
                <span class="font-semibold">{{ formatCurrency(result.stdDevLoss) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.commission') }}:</span>
                <span class="font-semibold">{{ formatCurrency(result.losingTradesCommission) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.avg_loss_time') }}:</span>
                <span class="font-semibold">{{ formatDurationMinutes(result.avgLossDuration) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.longest_loss_time') }}:</span>
                <span class="font-semibold">{{ formatDurationMinutes(result.maxLossDuration) }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.max_losing_streak') }}:</span>
                <span class="font-semibold loss-text">{{ result.maxLosingStreak }}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.max_drawdown') }}:</span>
                <span class="font-semibold" :class="result.maxDrawdown !== 0 ? 'loss-text' : ''">{{ formatLossValue(result.maxDrawdown) }}</span>
            </div>
            
            <div v-if="maxDrawdownDisplayDates.start" class="flex justify-between text-xs">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.max_drawdown_from') }}:</span>
                <span>{{ formatDateWithFallback(maxDrawdownDisplayDates.start) }}</span>
            </div>
            
            <div v-if="maxDrawdownDisplayDates.end" class="flex justify-between text-xs">
                <span class="text-secondary">{{ $t('components.dashboard.losing_trades.max_drawdown_to') }}:</span>
                <span>{{ formatDateWithFallback(maxDrawdownDisplayDates.end) }}</span>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { formatDurationMinutes, formatDateWithUserTimezone } from '~/utils/date-utils'

const { formatCurrency } = useUtils()

const { locale } = useI18n()
const userStore = useUserStore()
const { dashBoardResult : result} = useDashboard()

const maxDrawdownDisplayDates = computed(() => {
    const from = result.value.maxDrawdownDateFrom ? new Date(result.value.maxDrawdownDateFrom) : null
    const to = result.value.maxDrawdownDateTo ? new Date(result.value.maxDrawdownDateTo) : null

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

const formatLossValue = (value: number): string => {
    // Si la valeur est 0, afficher $0.00
    if (value === 0) return formatCurrency(0)
    // Sinon, afficher la valeur absolue (sans le signe négatif)
    return formatCurrency(Math.abs(value))
}

const formatDateWithFallback = (date: Date | null): string => {
    void timezoneKey.value

    if (!date) return '—'
    return formatDateWithUserTimezone(date, userStore.user?.settings_object, true, locale.value as 'fr' | 'en' | 'us')
}
</script>
