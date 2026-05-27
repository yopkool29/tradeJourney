<template>
    <div class="flex flex-col min-h-28">
        <div class="flex items-center gap-1">
            <div class="font-bold text-lg text-gray-600 dark:text-gray-300"
                :class="{ 'text-gray-400': !day.isCurrentMonth }">
                {{ day.dayNumber }}
            </div>
            <div v-if="day.screenshotCount > 0" class="flex items-center">
                <UIcon name="i-heroicons-photo" class="w-4 h-4 text-primary-500" />
            </div>
            <div v-if="day.hasDetailedNote" class="flex items-center">
                <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-primary-500" />
            </div>
        </div>
        <div v-if="day.isCurrentMonth && day.count > 0" class="flex flex-col gap-1 text-xs">
            <div class="form-row">
                <span class="stat-label">{{ $t('components.calendar.index.trades') }}:</span>
                <span class="stat-value">{{ day.count }}</span>
            </div>
            <div class="form-row">
                <span class="stat-label">{{ $t('components.calendar.index.winrate') }}:</span>
                <span class="stat-value">{{ day.winrate }}%</span>
            </div>
            <div class="form-row">
                <span class="stat-label">{{ $t('components.calendar.index.pnl') }}:</span>
                <span class="font-bold" :class="{
                    'calendar-pnl-positive': day.pnl > 0,
                    'calendar-pnl-negative': day.pnl < 0,
                }">
                    {{ formatCurrency(day.pnl) }}
                </span>
            </div>
            <div v-if="day.commission" class="form-row">
                <span class="stat-label-alt">Com:</span>
                <span class="text-xs text-gray-500">{{ formatCurrency(day.commission) }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface CalendarDay {
    dayNumber: number
    isCurrentMonth: boolean
    count: number
    winrate: number
    pnl: number
    commission?: number
    screenshotCount: number
    hasDetailedNote: boolean
}

defineProps<{
    day: CalendarDay
}>()

const { formatCurrency } = useUtils()
</script>
