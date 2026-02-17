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
                            backgroundColor: tradeTypeColor,
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
                <div v-if="trade.note">
                    <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.note') }}</span>
                    <p class="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">{{ trade.note }}</p>
                </div>
                <div v-if="trade.tags && trade.tags.length > 0">
                    <span class="text-secondary-sm block">{{ $t('components.common.columns.headers.tags') }}</span>
                    <div class="flex flex-wrap gap-1 mt-1">
                        <UBadge v-for="tag in trade.tags" :key="tag.id" color="neutral">
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
const colorMode = useColorMode()
const { getDigitFromSymbol } = useSymbols()

const isDark = computed(() => colorMode.value === 'dark')

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
const { t, locale } = useI18n()

const showScreenshots = ref(false)
const currentScreenshotIndex = ref(0)

const tradeTypeColor = computed(() => {
    if (!props.trade) return '#22c55e'
    const colorMode = isDark.value ? 'dark' : 'light'
    return props.trade.type === 'buy'
        ? userStore.user?.settings_object!.tradeTypeBadges?.buy?.[colorMode]
        : userStore.user?.settings_object!.tradeTypeBadges?.sell?.[colorMode]
})

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

const openScreenshotsModal = (screenshots: Array<{ id?: number; url: string }>, index: number = 0) => {
    currentScreenshotIndex.value = index
    showScreenshots.value = true
}
</script>
