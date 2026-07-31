<template>
    <CommonModalDefault
        v-model:open="isOpen"
        :hide-description="false"
        :description="trade?.uniqueId || ''"
        :title="$t('components.daily.trade_group.trade_details') + (trade?.account_displayName ? ' — ' + trade.account_displayName : '')"
        :ui="{ content: showChart ? 'max-w-7xl' : detailedNote || allScreenshots.length > 0 ? 'max-w-6xl' : 'max-w-3xl' }"
    >
        <template #content>
            <div v-if="trade" class="space-y-4">
                <div class="grid grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.symbol') }}</span>
                        <span class="font-semibold">{{ trade.symbol }}</span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.type') }}</span>
                        <UBadge
                            :style="{
                                backgroundColor: tradeTypeColors[trade.type],
                                color: 'white',
                            }"
                        >
                            {{ trade.type === 'buy' ? $t('common.trade_types.buy') : $t('common.trade_types.sell') }}
                        </UBadge>
                    </div>
                    <div class="">
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.profit') }}</span>
                        <span class="font-semibold" :class="trade.netProfit >= 0 ? 'profit-text' : 'loss-text'">
                            {{ formatCurrency(trade.netProfit) }}
                        </span>
                        <span class="text-secondary-xs text-gray-500 ml-1">
                            ({{ $t('components.common.columns.headers.grossProfit') }}: {{ formatCurrency(trade.profit) }},
                            {{ $t('components.common.columns.headers.commission') }}: {{ formatCurrency(trade.commission) }})
                        </span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.lot') }}</span>
                        <span class="font-semibold">{{ trade.lot }}</span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.openHour') }}</span>
                        <span>{{
                            formatDateWithUserTimezone(trade.openDate, userStore.user?.settings_object!, true, locale as 'fr' | 'en' | 'us')
                        }}</span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.closeHour') }}</span>
                        <span>{{
                            formatDateWithUserTimezone(trade.closeDate, userStore.user?.settings_object!, true, locale as 'fr' | 'en' | 'us')
                        }}</span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.openPrice') }}</span>
                        <span class="font-semibold">{{ trade.openPrice.toFixed(getDigitFromSymbol(trade.symbol, true)) }}</span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.closePrice') }}</span>
                        <span class="font-semibold">{{ trade.closePrice.toFixed(getDigitFromSymbol(trade.symbol, true)) }}</span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.stopLoss') }}</span>
                        <span class="font-semibold">{{
                            !trade.stopLoss ? '---' : trade.stopLoss.toFixed(getDigitFromSymbol(trade.symbol, true))
                        }}</span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.takeProfit') }}</span>
                        <span class="font-semibold">{{
                            !trade.takeProfit ? '---' : trade.takeProfit.toFixed(getDigitFromSymbol(trade.symbol, true))
                        }}</span>
                    </div>
                </div>
                <div v-if="isOption && optionMetadata" class="border-t pt-4">
                    <span class="text-secondary-sm block mb-2 font-semibold">Option Details</span>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="text-secondary-sm block">Spread Type</span>
                            <UBadge color="primary" variant="soft">{{ optionMetadata.spreadType }}</UBadge>
                        </div>
                        <div>
                            <span class="text-secondary-sm block">Position Effect</span>
                            <span class="font-semibold">{{ optionMetadata.posEffect }}</span>
                        </div>
                        <div>
                            <span class="text-secondary-sm block">Order Type</span>
                            <span class="font-semibold">{{ optionMetadata.orderType }}</span>
                        </div>
                    </div>
                    <div v-if="optionMetadata.legs && optionMetadata.legs.length > 0" class="mt-3">
                        <span class="text-secondary-sm block mb-2">Legs</span>
                        <div class="space-y-2">
                            <div v-for="(leg, index) in optionMetadata.legs" :key="index" class="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                                <div class="grid grid-cols-4 gap-2">
                                    <div>
                                        <span class="text-xs text-gray-500">Strike</span>
                                        <div class="font-semibold">{{ leg.strike }}</div>
                                    </div>
                                    <div>
                                        <span class="text-xs text-gray-500">Type</span>
                                        <div class="font-semibold uppercase">{{ leg.type }}</div>
                                    </div>
                                    <div>
                                        <span class="text-xs text-gray-500">Qty</span>
                                        <div class="font-semibold">{{ leg.qty }}</div>
                                    </div>
                                    <div>
                                        <span class="text-xs text-gray-500">Price</span>
                                        <div class="font-semibold">{{ leg.price.toFixed(2) }}</div>
                                    </div>
                                </div>
                                <div class="mt-1 text-xs text-gray-500">Exp: {{ formatDate(leg.expiration) }}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="trade.note">
                    <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.note') }}</span>
                    <UBadge color="neutral" class="whitespace-normal mt-1 inline-block" :title="trade.note">
                        <span class="wrap-break-word">{{ trade.note }}</span>
                    </UBadge>
                </div>
                <div v-if="tradeTags.length > 0">
                    <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.tags') }}</span>
                    <div class="flex flex-wrap gap-1 mt-1">
                        <UBadge v-for="tag in tradeTags" :key="tag.id" :style="getTagStyle(tag)">
                            {{ tag.name }}
                        </UBadge>
                    </div>
                </div>
                <div v-if="allScreenshots.length > 0" @click.stop>
                    <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.screenshots') }}</span>
                    <ScreenshotManager :model-value="allScreenshots" :readonly="true" :max-image-width="128" :max-image-height="128" />
                </div>
                <div v-if="showChart" class="border-t pt-4" @click.stop>
                    <TradeChart :key="trade.id" :trade="trade" :adjacent-trades="adjacentTrades" />
                </div>
                <div v-if="showDetailedNote && detailedNote">
                    <span class="text-secondary-sm block mb-2">{{ $t('components.trade.noteEditor.label') }}</span>
                    <CommonNoteEditor :model-value="detailedNote" :readonly="true" />
                </div>
            </div>
        </template>
    </CommonModalDefault>

    <CommonModalScreenshotCarousel
        :open="showScreenshots"
        :screenshots="allScreenshots"
        :initial-index="currentScreenshotIndex"
        @closed="showScreenshots = false"
    />
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
const { getDigitFromSymbol } = useSymbols()
const { getTagStyle, getTagById } = useTags()

const tradeTags = computed(() => {
    if (!props.trade?.tags?.length) return []
    return props.trade.tags.map((tag) => getTagById(tag.id)).filter((tag) => tag !== null)
})

const props = defineProps<{
    trade: TradeExtendedType | null
    isOpen: boolean
    groupTrades?: TradeExtendedType[]
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
}>()

const isOpen = computed({
    get: () => props.isOpen,
    set: (value: boolean) => emit('update:open', value),
})

const { formatCurrency } = useUtils()
const userStore = useUserStore()
const { locale } = useI18n()

const showScreenshots = ref(false)
const currentScreenshotIndex = ref(0)

const { tradeTypeColors } = useTypeColors()

const allScreenshots = computed(() => {
    if (!props.trade) return []
    const screenshots = props.trade.screenshots || []
    const hasScreenshots = screenshots.length > 0 || props.trade.screenshotUrl

    if (!hasScreenshots) return []

    return [
        ...screenshots.map((s: { id?: number; url: string }) => ({ id: s.id, url: s.url, isNew: false })),
        ...(props.trade && props.trade.screenshotUrl && !screenshots.some((s: { url: string }) => s.url === props.trade!.screenshotUrl)
            ? [{ url: props.trade.screenshotUrl, isNew: false }]
            : []),
    ]
})

const detailedNote = computed((): string => {
    return ((props.trade?.metadata as Record<string, unknown>)?.detailedNote as string) || ''
})

const isOption = computed(() => {
    return props.trade?.instrumentType === 'option'
})

// Adjacent trades: same symbol, same opening day, excluding the current trade.
const adjacentTrades = computed<TradeExtendedType[]>(() => {
    if (!props.trade || !props.groupTrades) return []
    const tradeOpenDate = new Date(props.trade.openDate)
    const tradeOpenDay = tradeOpenDate.toISOString().split('T')[0]
    return props.groupTrades.filter((t) => {
        if (t.id === props.trade!.id) return false
        if (t.symbol.toUpperCase() !== props.trade!.symbol.toUpperCase()) return false
        const tOpenDay = new Date(t.openDate).toISOString().split('T')[0]
        return tOpenDay === tradeOpenDay
    })
})

// Show the chart only for non-option trades (options have no underlying chart).
// Also requires a Polygon API key to be configured.
const showChart = computed(() => {
    if (!props.trade || isOption.value) return false
    if (!userStore.user?.settings_object?.showTradeChart) return false
    const apiKey = userStore.user?.settings_object?.polygonApiKey
    return !!(apiKey && apiKey.trim())
})

// Show detailed note based on user settings
const showDetailedNote = computed(() => {
    return userStore.user?.settings_object?.showDetailedNote ?? true
})

const optionMetadata = computed(() => {
    if (!props.trade?.metadata) return null
    try {
        return typeof props.trade.metadata === 'string' ? JSON.parse(props.trade.metadata) : props.trade.metadata
    } catch (e) {
        console.error('Failed to parse metadata:', e)
        return null
    }
})

const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' })
}

const _openScreenshotsModal = (screenshots: Array<{ id?: number; url: string }>, index: number = 0) => {
    currentScreenshotIndex.value = index
    showScreenshots.value = true
}
</script>
