<template>
    <UCard variant="subtle" class="my-2" :ui="{ header: 'p-2', body: 'sm:p-2 p-2' }">
        <template #header>
            <div class="flex justify-between items-start">
                <div>
                    <div class="cursor-pointer" @click="() => { displayTitle ? showTable = !showTable : null}">
                        <div v-if="displayTitle" class="flex items-center gap-2">
                            <div class="section-title-semibold">
                                {{ groupDate ? formatDateLongString(groupDate, locale as any, true) : '' }}
                            </div>
                            <div v-if="totalScreenshots > 0" class="stat-item items-center gap-1">
                                <UIcon name="i-heroicons-photo" class="w-4 h-4 text-primary-500" />
                                <!-- <span class="stat-value text-sm">{{ totalScreenshots }}</span> -->
                            </div>
                            <div v-if="hasDetailedNote" class="stat-item items-center">
                                <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-primary-500" />
                            </div>
                        </div>
                        <div class="tag-container-lg items-center mb-2 text-sm">
                            <div class="stat-item items-center">
                                <span class="stat-label">{{ $t('components.daily.trade_group.trades') }}:</span>
                                <span class="stat-value">{{ groupTrades.length }}</span>
                            </div>
                            <div class="stat-item items-center">
                                <span class="stat-label">{{ $t('components.daily.trade_group.win') }}:</span>
                                <span class="stat-value">{{ winLoss.wins }}</span>
                            </div>
                            <div class="stat-item items-center">
                                <span class="stat-label">{{ $t('components.daily.trade_group.loss') }}:</span>
                                <span class="stat-value">{{ winLoss.losses }}</span>
                            </div>
                            <div class="stat-item items-center">
                                <span class="stat-label">{{ $t('components.daily.trade_group.winrate') }}:</span>
                                <span class="stat-value">{{ winrate }}%</span>
                            </div>
                            <div class="stat-item gap-x-1 items-center">
                                <span class="stat-label">{{ $t('components.daily.trade_group.pnl') }}:</span>
                                <span class="stat-value text-lg leading-none" :class="pnl >= 0 ? 'profit-text' : 'loss-text'">
                                    {{ formatCurrency(pnl) }}
                                    <span v-if="totalCommission" class="text-xs text-gray-500 ml-1">[{{
                                        formatCurrency(totalCommission) }}]</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Graphiques - lazy render avec meme delai que la table -->
                    <div v-if="chartsVisible" class="form-row-lg ml-auto">
                        <!-- Graphique en anneau Winrate -->
                        <div class="w-16 h-16 flex items-center justify-center">
                            <DashboardChartsOldWinratePie :value="winrate / 100" />
                        </div>

                        <!-- Graphique d'évolution intraday -->
                        <div class="w-48 h-16">
                            <DashboardChartsMainIntradayPnlChart :chart-data="intradayChartData" :width="192" :height="64" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modals pour les DayTags et TradeTags -->
            <DailyDayTagModal :is-open="showDayTagModal" :date="groupDate" :day-tag="currentDayTag"
                @update:open="showDayTagModal = $event" />

            <CommonModalDelete v-model:open="showClearDayTagsModal" :from="'note_tags'"
                :title="$t('components.daily.trade_group.delete_day_note_title')" @confirm="onClearDayNoteTags">
                <template #content>
                    <p class="mb-4">{{ $t('components.daily.trade_group.delete_day_note_confirm') }}</p>
                </template>
            </CommonModalDelete>

            <!-- Modal de confirmation pour effacer les notes et tags -->
            <CommonModalDelete v-model:open="showClearTagsModal" :from="'note_tags'"
                :title="$t('components.daily.trade_group.delete_trade_note_title')" @confirm="onClearTradeNoteTags">
                <template #content>
                    <p class="mb-4">{{ $t('components.daily.trade_group.delete_trade_note_confirm') }}</p>
                </template>
            </CommonModalDelete>

            <!-- Modal de confirmation pour effacer la detailedNote -->
            <CommonModalDelete v-model:open="showClearDetailedNoteModal" :from="'detailed_note'"
                :title="$t('components.daily.trade_group.delete_detailed_note_title')"
                @confirm="executeClearDetailedNote">
                <template #content>
                    <p class="mb-4">{{ $t('components.daily.trade_group.delete_detailed_note_confirm') }}</p>
                </template>
            </CommonModalDelete>

            <!-- Modal pour afficher les détails d'un trade -->
            <DailyTradeDetailModal :is-open="showTradeDetailModal" :trade="selectedTradeDetail"
                :group-trades="props.groupTrades"
                @update:open="showTradeDetailModal = $event" />

            <div class="flex items-center gap-2 mt-2">
                <UButton icon="i-heroicons-pencil-square" color="primary" variant="ghost" size="xs"
                    :title="currentDayTag ? $t('components.daily.trade_group.edit_note') : $t('components.daily.trade_group.add_note')"
                    @click="openDayTagModal">{{
                        currentDayTag ? $t('components.daily.trade_group.edit') : $t('components.daily.trade_group.add')
                    }}</UButton>
                <UButton v-if="currentDayTag" icon="i-heroicons-trash" color="error" variant="soft" size="xs"
                    :title="$t('components.daily.trade_group.delete_day_note_title')"
                    @click="confirmClearDayTradeTags">{{
                        $t('common.actions.delete')
                    }}</UButton>

                <!-- Affichage des tags et de la note s'ils existent -->
                <div v-if="currentDayTag" class="tag-container-lg items-center ml-2">
                    <UBadge v-if="currentDayTag.note" color="neutral" :title="currentDayTag.note">
                        <span class="badge-clickable truncate2" @click="openDayTagModal">{{ currentDayTag.note }}</span>
                    </UBadge>
                    <UBadge v-for="tag in dayTagTags" :key="tag.id" class="badge-clickable" :label="tag.name" :style="getTagStyle(tag)"
                        :title="tag.description || tag.name"
                        @click="openDayTagModal">
                        {{ tag.name }}
                    </UBadge>
                </div>
            </div>

        </template>
        <div class="flex">
            <UCollapsible v-model:open="showTable" class="mb-2 w-full">
                <div v-if="showToggleButton" class="flex ml-[200px]">
                    <UButton size="xs" class="w-32 group" :label="$t('components.daily.trade_group.show_trades')"
                        color="neutral" variant="subtle" trailing-icon="i-lucide-chevron-down" :ui="{
                            trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
                        }" block @click="handleManualOpen" />
                </div>

                <template #content>
                    <div ref="tableContainer">
                        <DailyTradeGroupTable v-if="tableVisible" :columns="columns as any" :table-data="tableData"
                            :label-columns-header="labelColumnsHeader" :show-table="showTable" :timezone-key="timezoneKey"
                            :get-tag-style="getTagStyle as any" @activate="onActivate" @deactivate="onDeactivate"
                            @edit-trade="onEditTrade"
                            @open-tag-modal="openTradeTagModal" @open-detail-modal="openTradeDetailModal"
                            @open-screenshots="openScreenshotsModal" @open-detailed-note="openDirectDetailedNote"
                            @clear-tags="confirmClearTradeTags" @clear-detailed-note="onClearDetailedNote" />
                        <div v-else class="py-8 text-center text-gray-500">
                            <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
                        </div>
                    </div>
                </template>
            </UCollapsible>
        </div>

        <CommonModalScreenshotCarousel :open="showScreenshots" :screenshots="currentScreenshots"
            @closed="showScreenshots = false" />

        <TradeFormModal
            :open="showEditTrade"
            :trade="editingTrade"
            @update:open="showEditTrade = $event"
            @saved="onTradeSaved"
        />

        <TradeDetailedNoteModal v-model:open="showDirectDetailedNote" v-model:model-value="directDetailedNote"
            :trade-id="selectedTradeForNote?.id" @close="onDirectDetailedNoteClose" />
    </UCard>
</template>

<script setup lang="ts">
import { getWinLossNb, getWinrate, getPNL } from '~/utils/tradeStats'
import type { TradeExtendedType } from '~/schema/trade'

import { formatDateLongString } from '~/utils/date-utils'
import { generateIntradayPnlChartData } from '~/utils/dashboardChartGenerators'
import { defaultSettings } from '~/schema/user'
import { getTradeColumnHeaders } from '~/utils/tradeColumnHeaders'
import { UIcon } from '#components'
import DashboardChartsOldWinratePie from '~/components/dashboard/charts/old/WinratePie.vue'
import { useTradeGroupActions } from '~/composables/trades/useTradeGroupActions'

const { formatCurrency } = useUtils()
const { locale } = useI18n()
const { labelColumnsHeader } = getTradeColumnHeaders()

const userStore = useUserStore()
const dbStateStore = useDbStateStore()

const props = defineProps({
    groupDate: {
        type: Date,
        required: false,
        default: null,
    },
    groupTrades: {
        type: Array as PropType<TradeExtendedType[]>,
        default: () => [],
    },
    showToggleButton: {
        type: Boolean,
        default: true,
    },
    index: {
        type: Number,
        required: false,
        default: undefined,
    },
    displayTitle: {
        type: Boolean,
        required: false,
        default: true
    }
})

// Clé réactive pour forcer le re-rendu quand les settings de timezone changent
const timezoneKey = computed(() => {
    const settings = userStore.user?.settings_object
    return `${settings?.timezoneDisplay}-${settings?.timezoneLocal}-${settings?.timezoneUtcOffset}`
})

const { getTagStyle } = useTags()
const { displayModeNet } = useNetGrossDisplay()
const colorMode = useColorMode()

const tableRowHoverColor = computed(() => {
    const colors = userStore.user?.settings_object?.chartColors?.tableRowHover || defaultSettings.chartColors!.tableRowHover
    const theme = colorMode.value as 'light' | 'dark' | 'light-blue' | 'dark-gold'
    return colors[theme] || colors.light
})

// Trades actifs uniquement (pour les stats)
const activeTrades = computed(() => props.groupTrades.filter(t => t.active !== false))

const tradeStats = computed(() => ({
    winLoss: getWinLossNb(activeTrades.value, props.groupDate || new Date()),
    winrate: getWinrate(activeTrades.value, 1),
    pnl: getPNL(activeTrades.value, 2, displayModeNet.value),
    totalCommission: activeTrades.value.reduce((sum, t) => sum + (t.commission || 0), 0),
    intradayChartData: generateIntradayPnlChartData(activeTrades.value),
}))

const winLoss = computed(() => tradeStats.value.winLoss)
const winrate = computed(() => tradeStats.value.winrate)
const pnl = computed(() => tradeStats.value.pnl)
const totalCommission = computed(() => tradeStats.value.totalCommission)
const intradayChartData = computed(() => tradeStats.value.intradayChartData)

// Données du tableau calculées uniquement lorsque le collapsible est ouvert
const tableData = computed<TradeExtendedType[]>(() => {
    if (dbStateStore.dailyFilters.showInactive) {
        return props.groupTrades
    }
    return activeTrades.value
})

const emit = defineEmits<{
    tradeStatusChanged: [tradeId: number, active: boolean]
}>()

const groupTradesRef = computed(() => props.groupTrades)
const groupDateRef = computed(() => props.groupDate)

const {
    showDayTagModal, showScreenshots, currentScreenshots,
    showClearTagsModal, showClearDayTagsModal, showClearDetailedNoteModal,
    selectedTradeDetail, showTradeDetailModal,
    showDirectDetailedNote, directDetailedNote, selectedTradeForNote,
    showEditTrade, editingTrade,
    currentDayTag, dayTagTags, totalScreenshots, hasDetailedNote,
    openScreenshotsModal, openDayTagModal, openTradeTagModal,
    confirmClearTradeTags, confirmClearDayTradeTags,
    onClearTradeNoteTags, onActivate, onDeactivate, onClearDayNoteTags,
    openTradeDetailModal, onEditTrade, onTradeSaved,
    openDirectDetailedNote, onDirectDetailedNoteClose,
    onClearDetailedNote, executeClearDetailedNote,
} = useTradeGroupActions(groupTradesRef, groupDateRef, emit)

const addMeta = (defaultClass: string = 'w-[80px]') => {
    return {
        class: {
            td: defaultClass,
        },
    }
}

const columns = computed(() => {
    return [
        { id: 'actionToggle', header: () => h(UIcon, { name: '', class: 'size-4 text-[var(--ui-error)]' }), meta: addMeta('w-[40px]') },
        { id: 'symbol', accessorKey: 'symbol', header: labelColumnsHeader.value.symbol, meta: addMeta() },
        { id: 'account', accessorKey: 'account', header: labelColumnsHeader.value.account, meta: addMeta() },
        { id: 'type', accessorKey: 'type', header: labelColumnsHeader.value.type, meta: addMeta() },
        { id: 'openDate', accessorKey: 'openDate', header: labelColumnsHeader.value.openHour, meta: addMeta() },
        { id: 'closeDate', accessorKey: 'closeDate', header: labelColumnsHeader.value.closeHour, meta: addMeta() },
        { id: 'lot', accessorKey: 'lot', header: labelColumnsHeader.value.lot, meta: addMeta() },
        { id: 'openPrice', accessorKey: 'openPrice', header: labelColumnsHeader.value.openPrice, meta: addMeta() },
        { id: 'closePrice', accessorKey: 'closePrice', header: labelColumnsHeader.value.closePrice, meta: addMeta() },
        { id: 'profit', accessorKey: 'netProfit', header: labelColumnsHeader.value.profit, meta: addMeta() },
        {
            id: 'grossProfit',
            accessorKey: 'profit',
            header: labelColumnsHeader.value.grossProfit,
            cell: ({ row }: { row: { original: TradeExtendedType } }) => formatCurrency(row.original.profit || 0),
            meta: addMeta('w-[100px]')
        },
        {
            id: 'commission',
            accessorKey: 'commission',
            header: labelColumnsHeader.value.commission,
            cell: ({ row }: { row: { original: TradeExtendedType } }) => formatCurrency(row.original.commission || 0),
            meta: addMeta('w-[100px]')
        },
        {
            id: 'stopLoss',
            accessorKey: 'stopLoss',
            header: labelColumnsHeader.value.stopLoss,
            meta: addMeta('w-[100px]')
        },
        {
            id: 'takeProfit',
            accessorKey: 'takeProfit',
            header: labelColumnsHeader.value.takeProfit,
            meta: addMeta('w-[100px]')
        },
        {
            id: 'riskReward',
            header: labelColumnsHeader.value.riskReward,
            cell: ({ row }: { row: { original: TradeExtendedType } }) => {
                const metadata = row.original.metadata as Record<string, unknown> | null | undefined
                const storedValue = metadata?.riskReward as number | undefined
                if (storedValue === undefined || storedValue === null || storedValue === 0) return '---'
                const value = Number(storedValue)
                if (isNaN(value)) return '---'
                const formatted = value.toFixed(2)
                if (value < 0) {
                    return h('span', { class: 'text-red-500 dark:text-red-400' }, formatted)
                }
                return formatted
            },
            meta: addMeta('w-[80px]')
        },
    ]
})

const showTable = defineModel('showTable', { type: Boolean, default: false })

// Instance pour la table (declenchee par showTable)
const { isVisible: tableVisible, setOverrideDelay } = useConditionalLazyRender(
    showTable,
    { index: props.index, baseDelay: 500, delayIncrement: 100, maxIndexedDelay: 1000 }
)

// Instance pour les graphiques (toujours declenchee au montage avec meme delai)
const { isVisible: chartsVisible, triggerRender: renderCharts } = useLazyRender(
    { index: props.index, baseDelay: 500, delayIncrement: 100, maxIndexedDelay: 1000 }
)
// Declencher le rendu des graphiques au montage
onMounted(() => {
    renderCharts()
})

// Click handler - pas de delai quand on ouvre manuellement
const handleManualOpen = () => {
    setOverrideDelay(0)
    setTimeout(() => {
        setOverrideDelay(undefined)
    }, 0)
}
</script>

<style scoped>
.custom-table-hover :deep(tbody tr:hover) {
    background-color: v-bind('tableRowHoverColor');
}
</style>
