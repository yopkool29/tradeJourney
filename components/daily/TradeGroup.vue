<template>
    <UCard variant="subtle" class="my-2" :ui="{ header: 'p-2', body: 'sm:p-2 p-2' }">
        <template #header>
            <div class="flex justify-between items-start">
                <div>
                    <div v-if="displayTitle" class="flex items-center gap-2">
                        <div class="section-title-semibold">
                            {{ groupDate ? formatDateLongString(groupDate, locale, true) : '' }}
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

                    <!-- Graphiques - lazy render avec meme delai que la table -->
                    <div v-if="chartsVisible" class="form-row-lg ml-auto">
                        <!-- Graphique en anneau Winrate -->
                        <div class="w-16 h-16 flex items-center justify-center">
                            <DashboardChartsWinratePie :value="winrate / 100" />
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
                @update:open="showTradeDetailModal = $event" />

            <div class="flex items-center gap-2 mt-2">
                <UTooltip
                    :text="currentDayTag ? $t('components.daily.trade_group.edit_note') : $t('components.daily.trade_group.add_note')">
                    <UButton icon="i-heroicons-pencil-square" color="primary" variant="ghost" size="xs"
                        @click="openDayTagModal">{{
                            currentDayTag ? $t('components.daily.trade_group.edit') : $t('components.daily.trade_group.add')
                        }}</UButton>
                </UTooltip>
                <UTooltip v-if="currentDayTag" :text="$t('components.daily.trade_group.delete_day_note_title')">
                    <UButton icon="i-heroicons-trash" color="error" variant="soft" size="xs"
                        @click="confirmClearDayTradeTags">{{
                            $t('common.actions.delete')
                        }}</UButton>
                </UTooltip>

                <!-- Affichage des tags et de la note s'ils existent -->
                <div v-if="currentDayTag" class="tag-container-lg items-center ml-2">
                    <UTooltip v-if="currentDayTag.note" :text="currentDayTag.note">
                        <UBadge color="neutral">
                            <span class="badge-clickable truncate2" @click="openDayTagModal">{{ currentDayTag.note }}</span>
                        </UBadge>
                    </UTooltip>
                    <UTooltip v-for="tag in dayTagTags" :key="tag.id" :text="tag.description || tag.name">
                        <UBadge class="badge-clickable" title="" :label="tag.name" :style="getTagStyle(tag)"
                            @click="openDayTagModal">
                            {{ tag.name }}
                        </UBadge>
                    </UTooltip>
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
                        <DailyTradeGroupTable v-if="tableVisible" :columns="columns" :table-data="tableData"
                            :label-columns-header="labelColumnsHeader" :show-table="showTable" :timezone-key="timezoneKey"
                            :get-tag-style="getTagStyle" @activate="onActivate" @deactivate="onDeactivate"
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

        <TradeDetailedNoteModal v-model:open="showDirectDetailedNote" v-model:model-value="directDetailedNote"
            :trade-id="selectedTradeForNote?.id" @close="onDirectDetailedNoteClose" />
    </UCard>
</template>

<script setup lang="ts">
import { getWinLossNb, getWinrate, getPNL } from '~/utils/tradeStats'
import type { DayTagType } from '~/schema/dayTag'
import type { TradeExtendedType } from '~/schema/trade'

import { formatDateLongString, normalizeDateToLocalString, normalizeDateToUTCString } from '~/utils/date-utils'
import { generateIntradayPnlChartData } from '~/utils/dashboard'
import { defaultSettings } from '~/schema/user'
import { UIcon } from '#components'

const { formatCurrency } = useUtils()
const { t, locale } = useI18n()

const userStore = useUserStore()
const appConfig = useAppConfig()

const { log_error } = useLogView()

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

const showDayTagModal = ref(false)
// État pour gérer l'affichage de la modal de captures d'écran
const showScreenshots = ref(false)
const currentScreenshots = ref<Array<{ id?: number; url: string }>>([])

const showClearTagsModal = ref(false)
const showClearDayTagsModal = ref(false)
const showClearDetailedNoteModal = ref(false)
const selectedTrade = ref<TradeExtendedType | null>(null)
const selectedTradeForDetailedNote = ref<TradeExtendedType | null>(null)

// Composable pour gérer les trades
const { getTagStyle, getTagById } = useTags()
const { fetchTrade, updateTrade, deleteTrade, unDeleteTrade } = useTrades()
const { cleanupOrphanImages } = useNoteImages()
const { deleteDayTag } = useDayTags()
const { deleteTradeTags } = useTradeTags()
const { displayModeNet } = useNetGrossDisplay()
const colorMode = useColorMode()

const currentDayTag = computed(() => {
    if (!props.groupDate) return null
    return userStore.dayTags.find((dt: DayTagType) => {
        const dtDateStr = normalizeDateToUTCString(new Date(dt.date))
        const dateStr = normalizeDateToLocalString(props.groupDate)
        return dtDateStr === dateStr
    }) || null
})

const dayTagTags = computed(() => {
    if (!currentDayTag.value?.tags) return []
    return currentDayTag.value.tags.map(tag => getTagById(tag.id)).filter(tag => tag !== null).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
})

const tableRowHoverColor = computed(() => {
    const colors = userStore.user?.settings_object?.chartColors?.tableRowHover || defaultSettings.chartColors!.tableRowHover
    const theme = colorMode.value as 'light' | 'dark' | 'light-blue' | 'dark-gold'
    return colors[theme] || colors.light
})

// Modal pour afficher les détails d'un trade
const selectedTradeDetail = ref<TradeExtendedType | null>(null)
const showTradeDetailModal = ref(false)

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

// Nombre total de screenshots pour tous les trades du groupe
const totalScreenshots = computed(() => {
    return props.groupTrades.reduce((total, trade) => {
        const screenshots = trade.screenshots?.length || 0
        const hasScreenshotUrl = trade.screenshotUrl ? 1 : 0
        return total + screenshots + hasScreenshotUrl
    }, 0)
})

// Indique si au moins un trade a une note détaillée
const hasDetailedNote = computed(() => {
    return props.groupTrades.some(trade => {
        const detailedNote = (trade.metadata as Record<string, unknown>)?.detailedNote as string
        return detailedNote && detailedNote.length > 0
    })
})

// Données du tableau calculées uniquement lorsque le collapsible est ouvert
const tableData = computed<TradeExtendedType[]>(() => {
    if (userStore.dailyFilters.showInactive) {
        return props.groupTrades
    }
    return activeTrades.value
})

// Fonction pour ouvrir la modal des captures d'écran
const openScreenshotsModal = (trade: TradeExtendedType) => {
    const screenshots = [
        ...(trade.screenshots || []),
        ...(trade.screenshotUrl && !(trade.screenshots || []).some(s => s.url === trade.screenshotUrl)
            ? [{ url: trade.screenshotUrl }]
            : []),
    ]
    currentScreenshots.value = screenshots
    showScreenshots.value = true
}

const addMeta = (defaultClass: string = 'w-[80px]') => {
    return {
        class: {
            td: defaultClass,
        },
    }
}

const labelColumnsHeader = computed(() => {
    return {
        actionToggle: t('components.common.columns.headers.actions'),
        actions: t('components.common.columns.headers.actions'),
        note: t('components.common.columns.headers.note'),
        tags: t('components.common.columns.headers.tags'),
        screenshots: t('components.common.columns.headers.screenshots'),
        symbol: t('components.common.columns.headers.symbol'),
        account: t('components.common.columns.headers.account'),
        type: t('components.common.columns.headers.type'),
        lot: t('components.common.columns.headers.lot'),
        openDate: t('components.common.columns.headers.openHour'),
        closeDate: t('components.common.columns.headers.closeHour'),
        openHour: t('components.common.columns.headers.openHour'),
        closeHour: t('components.common.columns.headers.closeHour'),
        openPrice: t('components.common.columns.headers.openPrice'),
        closePrice: t('components.common.columns.headers.closePrice'),
        profit: t('components.common.columns.headers.profit'),
        grossProfit: t('components.common.columns.headers.grossProfit'),
        commission: t('components.common.columns.headers.commission'),
        stopLoss: t('components.common.columns.headers.stopLoss'),
        takeProfit: t('components.common.columns.headers.takeProfit'),
        // Index signature is added via the type assertion below
    }
})

const columns = computed(() => {
    return [
        { id: 'actionToggle', header: () => h(UIcon, { name: '', class: 'size-4 text-[var(--ui-error)]' }), meta: addMeta('w-[40px]') },
        { id: 'symbol', accessorKey: 'symbol', header: labelColumnsHeader.value.symbol, meta: addMeta() },
        { id: 'account', accessorKey: 'account', header: labelColumnsHeader.value.account, meta: addMeta() },
        { id: 'type', accessorKey: 'type', header: labelColumnsHeader.value.type, meta: addMeta() },
        { id: 'lot', accessorKey: 'lot', header: labelColumnsHeader.value.lot, meta: addMeta() },
        { id: 'openDate', accessorKey: 'openDate', header: labelColumnsHeader.value.openHour, meta: addMeta() },
        { id: 'closeDate', accessorKey: 'closeDate', header: labelColumnsHeader.value.closeHour, meta: addMeta() },
        { id: 'openPrice', accessorKey: 'openPrice', header: labelColumnsHeader.value.openPrice, meta: addMeta() },
        { id: 'closePrice', accessorKey: 'closePrice', header: labelColumnsHeader.value.closePrice, meta: addMeta() },
        { id: 'profit', accessorKey: 'netProfit', header: labelColumnsHeader.value.profit, meta: addMeta() },
        {
            id: 'grossProfit',
            accessorKey: 'profit',
            header: labelColumnsHeader.value.grossProfit,
            cell: ({ row }) => formatCurrency(row.original.profit || 0),
            meta: addMeta('w-[100px]')
        },
        {
            id: 'commission',
            accessorKey: 'commission',
            header: labelColumnsHeader.value.commission,
            cell: ({ row }) => formatCurrency(row.original.commission || 0),
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
    ]
})

// Ouvrir la modal pour ajouter/modifier un DayTag
const openDayTagModal = () => {
    showDayTagModal.value = true
}

const { open: openTagModal } = useTradeTagModal()

// Ouvrir la modal pour modifier un trade et ses tags
const openTradeTagModal = (trade: TradeExtendedType) => {
    openTagModal(trade, async () => {
        const result = await fetchTrade(trade.id)
        if (!result) return
        trade.note = result.note
        trade.tags = result.tags
        trade.screenshots = result.screenshots
        trade.screenshotUrl = result.screenshotUrl
        trade.metadata = result.metadata
    })
}

// Ouvrir la modal de confirmation pour effacer les notes et tags
const confirmClearTradeTags = (trade: TradeExtendedType) => {
    selectedTrade.value = trade
    if (userStore.user?.settings_object?.deleteConfirmationNoteTags === false) {
        onClearTradeNoteTags()
    } else {
        showClearTagsModal.value = true
    }
}

const confirmClearDayTradeTags = () => {
    if (userStore.user?.settings_object?.deleteConfirmationNoteTags === false) {
        onClearDayNoteTags()
    } else {
        showClearDayTagsModal.value = true
    }
}

// Effacer les notes et tags d'un trade
const onClearTradeNoteTags = async () => {
    if (!selectedTrade.value || !selectedTrade.value.id) return

    try {
        await deleteTradeTags(selectedTrade.value.id)
        await updateTrade({
            id: selectedTrade.value.id,
            note: '',
            screenshots: [], // Supprime aussi les screenshots
        })

        // Recharger le trade pour avoir les données à jour
        const result = await fetchTrade(selectedTrade.value.id)
        if (result && selectedTrade.value) {
            selectedTrade.value.note = result.note
            selectedTrade.value.tags = result.tags
            selectedTrade.value.screenshots = result.screenshots
            selectedTrade.value.screenshotUrl = result.screenshotUrl
        }
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        log_error(message)
    }
}

const emit = defineEmits<{
    tradeStatusChanged: [tradeId: number, active: boolean]
}>()

const onActivate = async (tradeId: number) => {
    await unDeleteTrade(tradeId)
    const trade = props.groupTrades.find(t => t.id === tradeId)
    if (trade) {
        trade.active = true
    }
    emit('tradeStatusChanged', tradeId, true)
}

const onDeactivate = async (tradeId: number) => {
    await deleteTrade(tradeId)
    const trade = props.groupTrades.find(t => t.id === tradeId)
    if (trade) {
        trade.active = false
    }
    emit('tradeStatusChanged', tradeId, false)
}

const onClearDayNoteTags = async () => {
    try {
        if (!currentDayTag.value?.id) return
        await deleteDayTag(currentDayTag.value.id)
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        log_error(message)
    }
}

const showTable = defineModel('showTable', { type: Boolean, default: false })

// Instance pour la table (declenchee par showTable)
const { isVisible: tableVisible, triggerRender: renderTable, forceRender: forceTableRender, setOverrideDelay, reset: resetTableRender } = useConditionalLazyRender(
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
    // Force le rendu immediat sans delai pour la table
    setOverrideDelay(0)
    setTimeout(() => {
        setOverrideDelay(undefined)
    }, 0)
}

const openTradeDetailModal = (trade: TradeExtendedType) => {
    selectedTradeDetail.value = trade
    showTradeDetailModal.value = true
}

const showDirectDetailedNote = ref(false)
const directDetailedNote = ref('')
const selectedTradeForNote = ref<TradeExtendedType | null>(null)

const openDirectDetailedNote = async (trade: TradeExtendedType) => {
    const { fetchTrade } = useTrades()
    selectedTradeForNote.value = trade
    const fetched = await fetchTrade(trade.id)
    directDetailedNote.value = (fetched?.metadata as Record<string, unknown>)?.detailedNote as string || ''
    showDirectDetailedNote.value = true
}

const onDirectDetailedNoteClose = async () => {
    if (!selectedTradeForNote.value) return
    const { updateTrade, fetchTrade } = useTrades()
    await updateTrade({ id: selectedTradeForNote.value.id, detailedNote: directDetailedNote.value })
    const result = await fetchTrade(selectedTradeForNote.value.id)
    if (result) selectedTradeForNote.value.metadata = result.metadata
}

const onClearDetailedNote = async (trade: TradeExtendedType) => {
    selectedTradeForDetailedNote.value = trade
    if (userStore.user?.settings_object?.deleteConfirmationNoteTags === false) {
        await executeClearDetailedNote()
    } else {
        showClearDetailedNoteModal.value = true
    }
}

const executeClearDetailedNote = async () => {
    if (!selectedTradeForDetailedNote.value) return
    try {
        const { updateTrade, fetchTrade } = useTrades()
        const oldContent = (selectedTradeForDetailedNote.value.metadata as Record<string, unknown>)?.detailedNote as string || ''
        await updateTrade({ id: selectedTradeForDetailedNote.value.id, detailedNote: '' })
        await cleanupOrphanImages(oldContent, '')
        const result = await fetchTrade(selectedTradeForDetailedNote.value.id)
        if (result) {
            selectedTradeForDetailedNote.value.metadata = result.metadata
        }
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        log_error(message)
    }
}
</script>

<style scoped>
.custom-table-hover :deep(tbody tr:hover) {
    background-color: v-bind('tableRowHoverColor');
}
</style>
