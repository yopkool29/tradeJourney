<template>
    <UModal v-model:open="open" fullscreen :title="$t('components.trade.journal.title', { month: formattedMonth })">
        <template #body>
            <div class="p-4 h-full overflow-y-auto">
                <!-- Loading -->
                <div v-if="loading" class="flex justify-center items-center h-64">
                    <UIcon name="i-heroicons-arrow-path" class="animate-spin text-gray-400 text-3xl" />
                </div>

                <!-- Empty -->
                <div v-else-if="groupedTrades.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-400">
                    <UIcon name="i-heroicons-document-text" class="text-5xl mb-3" />
                    <p>{{ $t('components.trade.journal.empty') }}</p>
                </div>

                <!-- Timeline -->
                <div v-else class="max-w-3xl mx-auto">
                    <div
                        v-for="group in groupedTrades"
                        :key="group.date"
                        class="mb-10"
                    >
                        <!-- Date separator -->
                        <div class="flex items-center gap-3 mb-4 sticky top-0 bg-white dark:bg-gray-900 py-2 z-10">
                            <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                            <span class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                {{ formatDateLongString(group.date, locale as 'fr' | 'en' | 'us', true) }}
                            </span>
                            <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                        </div>

                        <!-- Trades of the day -->
                        <div class="relative pl-6">
                            <!-- Vertical line -->
                            <div class="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

                            <div
                                v-for="trade in group.trades"
                                :key="trade.id"
                                class="relative mb-6"
                            >
                                <!-- Timeline dot -->
                                <div
                                    class="absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900"
                                    :class="trade.profit >= 0 ? 'bg-green-500' : 'bg-red-500'"
                                />

                                <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                    <!-- Trade header -->
                                    <div class="flex items-center gap-3 flex-wrap mb-2">
                                        <span class="text-xs text-gray-400 font-mono">
                                            {{ formatHourString(trade.openDate, false, locale as 'fr' | 'en' | 'us') }}
                                        </span>
                                        <span class="font-semibold text-gray-800 dark:text-gray-100">{{ trade.symbol }}</span>
                                        <UBadge :style="{ backgroundColor: tradeTypeColors[trade.type], color: 'white' }" size="xs">
                                            {{ trade.type === 'buy' ? $t('common.trade_types.buy') : $t('common.trade_types.sell') }}
                                        </UBadge>
                                        <span
                                            class="font-semibold text-sm ml-auto"
                                            :class="trade.profit >= 0 ? 'profit-text' : 'loss-text'"
                                        >
                                            {{ formatCurrency(trade.profit) }}
                                        </span>
                                    </div>

                                    <!-- Tags -->
                                    <div v-if="getTradeTagsById(trade).length > 0" class="flex flex-wrap gap-1 mb-2">
                                        <UBadge
                                            v-for="tag in getTradeTagsById(trade)"
                                            :key="tag.id"
                                            :style="getTagStyle(tag)"
                                            size="xs"
                                        >
                                            {{ tag.name }}
                                        </UBadge>
                                    </div>

                                    <!-- Short note -->
                                    <p v-if="trade.note" class="text-sm text-gray-600 dark:text-gray-300 mb-2 italic">
                                        {{ trade.note }}
                                    </p>

                                    <!-- Detailed note (Milkdown readonly) -->
                                    <div v-if="getDetailedNote(trade)" class="mt-2">
                                        <CommonNoteEditor
                                            :model-value="getDetailedNote(trade)"
                                            :readonly="true"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
import { formatDateLongString, formatHourString, formatDateToYYYYMMDD } from '~/utils/date-utils'
import type { TradeExtendedType } from '~/schema/trade'

type Props = {
    selectedMonth: string
}

const props = defineProps<Props>()

const open = defineModel<boolean>('open', { required: true })
const { locale } = useI18n()
const { fetchTrades } = useTrades()
const { getTagStyle, getTagById } = useTags()
const { tradeTypeColors } = useTypeColors()
const { formatCurrency } = useUtils()

const loading = ref(false)
const trades = ref<TradeExtendedType[]>([])

const getTradeTagsById = (trade: TradeExtendedType) => {
    if (!trade.tags?.length) return []
    return trade.tags.map(tag => getTagById(tag.id)).filter(tag => tag !== null)
}

type DayGroup = {
    date: string
    trades: TradeExtendedType[]
}

const formattedMonth = computed(() => {
    if (!props.selectedMonth) return ''
    const [year, month] = props.selectedMonth.split('-')
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
        locale.value === 'fr' ? 'fr-FR' : locale.value === 'us' ? 'en-US' : 'en-GB',
        { month: 'long', year: 'numeric' }
    )
})

const groupedTrades = computed((): DayGroup[] => {
    const map = new Map<string, TradeExtendedType[]>()
    for (const trade of trades.value) {
        const key = formatDateToYYYYMMDD(trade.openDate)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(trade)
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dayTrades]) => ({ date, trades: dayTrades }))
})

const getDetailedNote = (trade: TradeExtendedType): string => {
    return (trade.metadata as Record<string, unknown>)?.detailedNote as string || ''
}

const loadTrades = async () => {
    if (!props.selectedMonth) return
    loading.value = true
    try {
        const [year, month] = props.selectedMonth.split('-').map(Number)
        const startDate = new Date(year, month - 1, 1).toISOString()
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()
        trades.value = await fetchTrades({ startDate, endDate }, -1)
    } finally {
        loading.value = false
    }
}

watch(open, (val) => {
    if (val) loadTrades()
})

watch(() => props.selectedMonth, () => {
    if (open.value) loadTrades()
})
</script>
