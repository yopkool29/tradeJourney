<template>
    <CommonModalDefault v-model:open="isOpen" :title="$t('components.daily.trade_group.trade_details')"
        :ui="{ content: 'max-w-2xl' }">
        <template #content>
            <div v-if="trade" class="space-y-4">
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.symbol')
                            }}</span>
                        <span class="font-semibold">{{ trade.symbol }}</span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.type') }}</span>
                        <UBadge :style="{
                            backgroundColor: tradeTypeColors[trade.type],
                            color: 'white',
                        }">
                            {{ trade.type === 'buy' ? $t('common.trade_types.buy') : $t('common.trade_types.sell') }}
                        </UBadge>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.profit')
                            }}</span>
                        <span class="font-semibold" :class="trade.profit >= 0 ? 'profit-text' : 'loss-text'">
                            {{ formatCurrency(trade.profit) }}
                        </span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.account')
                            }}</span>
                        <span class="font-semibold">{{ trade.account_displayName }}</span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.lot') }}</span>
                        <span class="font-semibold">{{ trade.lot }}</span>
                    </div>
                    <div></div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.openPrice')
                            }}</span>
                        <span class="font-semibold">{{ trade.openPrice.toFixed(getDigitFromSymbol(trade.symbol, true))
                            }}</span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.closePrice')
                            }}</span>
                        <span class="font-semibold">{{ trade.closePrice.toFixed(getDigitFromSymbol(trade.symbol, true))
                            }}</span>
                    </div>
                    <div></div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.openHour')
                            }}</span>
                        <span>{{ formatDateWithUserTimezone(trade.openDate, userStore.user?.settings_object!, true,
                            locale as 'fr' | 'en' | 'us') }}</span>
                    </div>
                    <div>
                        <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.closeHour')
                            }}</span>
                        <span>{{ formatDateWithUserTimezone(trade.closeDate, userStore.user?.settings_object!, true,
                            locale as 'fr' | 'en' | 'us') }}</span>
                    </div>
                    <div></div>
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
                            <div v-for="(leg, index) in optionMetadata.legs" :key="index" 
                                class="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
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
                    <p class="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">{{ trade.note }}</p>
                </div>
                <div v-if="detailedNote">
                    <span class="text-secondary-sm block mb-2">{{ $t('components.trade.noteEditor.label') }}</span>
                    <CommonNoteEditor
                        :model-value="detailedNote"
                        :readonly="true"
                    />
                </div>
                <div v-if="trade.tags && trade.tags.length > 0">
                    <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.tags') }}</span>
                    <div class="flex flex-wrap gap-1 mt-1">
                        <UBadge v-for="tag in trade.tags" :key="tag.id" :style="getTagStyle(tag)">
                            {{ tag.name }}
                        </UBadge>
                    </div>
                </div>
                <div v-if="allScreenshots.length > 0">
                    <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.screenshots')
                        }}</span>
                    <div class="flex flex-wrap gap-2 mt-2">
                        <UTooltip :text="allScreenshots.length > 1
                                ? $t('components.common.columns.screenshots.multiple', { count: allScreenshots.length })
                                : $t('components.common.columns.screenshots.single')">
                            <UButton variant="ghost" color="neutral" icon="i-heroicons-photo"
                                class="text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors duration-200"
                                @click="openScreenshotsModal(allScreenshots, 0)" />
                        </UTooltip>
                    </div>
                </div>
            </div>
        </template>
    </CommonModalDefault>

    <CommonModalScreenshotCarousel :open="showScreenshots" :screenshots="allScreenshots"
        :initial-index="currentScreenshotIndex" @closed="showScreenshots = false" />
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
const { getDigitFromSymbol } = useSymbols()
const { getTagStyle } = useTags()

const props = defineProps<{
    trade: TradeExtendedType | null
    isOpen: boolean
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
}>()

const isOpen = computed({
    get: () => props.isOpen,
    set: (value: boolean) => emit('update:open', value)
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
        ...screenshots,
        ...(props.trade && props.trade.screenshotUrl && !screenshots.some((s: { url: string }) => s.url === props.trade!.screenshotUrl)
            ? [{ url: props.trade.screenshotUrl }]
            : []),
    ]
})

const detailedNote = computed((): string => {
    return (props.trade?.metadata as Record<string, unknown>)?.detailedNote as string || ''
})

const isOption = computed(() => {
    return props.trade?.instrumentType === 'option'
})

const optionMetadata = computed(() => {
    if (!props.trade?.metadata) return null
    try {
        return typeof props.trade.metadata === 'string' 
            ? JSON.parse(props.trade.metadata) 
            : props.trade.metadata
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

const openScreenshotsModal = (screenshots: Array<{ id?: number; url: string }>, index: number = 0) => {
    currentScreenshotIndex.value = index
    showScreenshots.value = true
}
</script>
