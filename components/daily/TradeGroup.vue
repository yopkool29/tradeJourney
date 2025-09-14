<template>
    <UCard class="my-6" :ui="{ header: 'p-2', body: 'sm:p-2 p-2' }">
        <template #header>
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-bold text-lg">
                        {{ groupDate ? formatDateLong(groupDate, locale) : '' }}
                    </div>
                    <div class="flex flex-wrap gap-2 items-center mb-2 text-sm">
                        <div class="flex items-center">
                            <span class="font-semibold">{{ $t('components.daily.trade_group.trades') }}:</span>
                            <span class="ml-1">{{ groupTrades.length }}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="font-semibold">{{ $t('components.daily.trade_group.win') }}:</span>
                            <span class="ml-1">{{ winLoss.wins }}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="font-semibold">{{ $t('components.daily.trade_group.loss') }}:</span>
                            <span class="ml-1">{{ winLoss.losses }}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="font-semibold">{{ $t('components.daily.trade_group.winrate') }}:</span>
                            <span class="ml-1">{{ winrate }}%</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="font-semibold">{{ $t('components.daily.trade_group.pnl') }}:</span>
                            <span class="ml-1 text-lg font-semibold" :class="pnl >= 0 ? 'text-green-600' : 'text-red-600'">{{
                                formatCurrency(pnl)
                            }}</span>
                        </div>
                    </div>

                    <!-- Graphiques -->
                    <div class="flex items-center gap-4 ml-auto">
                        <!-- Graphique en anneau Winrate -->
                        <div class="w-16 h-16 flex items-center justify-center">
                            <DashboardWinratePie :value="winrate / 100" />
                        </div>

                        <!-- Graphique d'évolution intraday -->
                        <div class="w-48 h-16">
                            <DashboardIntradayPnlChart :chart-data="intradayChartData" :width="192" :height="64" />
                        </div>
                    </div>
                </div>

                <div class="flex gap-4">
                    <UTooltip :text="dayTag ? $t('components.daily.trade_group.edit_note') : $t('components.daily.trade_group.add_note')">
                        <UButton icon="i-heroicons-pencil-square" color="primary" variant="ghost" size="xs" @click="openDayTagModal">{{
                            dayTag ? $t('components.daily.trade_group.edit') : $t('components.daily.trade_group.add')
                        }}</UButton>
                    </UTooltip>
                    <UTooltip v-if="dayTag" :text="$t('common.actions.delete')">
                        <UButton icon="i-heroicons-trash" color="error" variant="soft" size="xs" @click="confirmClearDayTradeTags">{{
                            $t('common.actions.delete')
                        }}</UButton>
                    </UTooltip>
                </div>
            </div>

            <!-- Modals pour les DayTags et TradeTags -->
            <DailyDayTagModal
                :is-open="showDayTagModal"
                :date="groupDate"
                :day-tag="dayTag"
                @update:open="showDayTagModal = $event"
                @saved="onDayTagSaved"
            />

            <TradeTagModal
                :is-open="showTradeTagModal"
                :trade="selectedTrade!"
                @update:open="showTradeTagModal = $event"
                @saved="onTradeTagsUpdated"
            />

            <CommonModalDelete
                v-model:open="showClearDayTagsModal"
                :from="'note_tags'"
                :title="$t('components.daily.trade_group.delete_day_note_title')"
                @confirm="onClearDayNoteTags"
            >
                <template #content>
                    <p class="mb-4">{{ $t('components.daily.trade_group.delete_day_note_confirm') }}</p>
                </template>
            </CommonModalDelete>

            <!-- Modal de confirmation pour effacer les notes et tags -->
            <CommonModalDelete
                v-model:open="showClearTagsModal"
                :from="'note_tags'"
                :title="$t('components.daily.trade_group.delete_trade_note_title')"
                @confirm="onClearTradeNoteTags"
            >
                <template #content>
                    <p class="mb-4">{{ $t('components.daily.trade_group.delete_trade_note_confirm') }}</p>
                </template>
            </CommonModalDelete>

            <!-- Affichage des tags et de la note s'ils existent -->
            <div v-if="dayTag" class="flex gap-2 flex-row items-center mt-2">
                <div v-if="dayTag.note">
                    <UTooltip :text="dayTag.note">
                        <UBadge color="neutral">
                            <span class="cursor-pointer truncate2" @click="openDayTagModal">{{ dayTag.note }}</span>
                        </UBadge>
                    </UTooltip>
                </div>
                <div v-if="dayTag.tags?.length > 0" class="flex flex-wrap gap-1">
                    <UTooltip v-for="tag in dayTag.tags" :key="tag.id" :text="tag.description || tag.name">
                        <UBadge class="cursor-pointer" title="" :label="tag.name" :style="getTagStyle(tag)" @click="openDayTagModal">
                            {{ tag.name }}
                        </UBadge>
                    </UTooltip>
                </div>
            </div>
        </template>
        <div class="flex">
            <UCollapsible v-model:open="showTable" class="mb-2 w-full">
                <UButton
                    size="xs"
                    class="w-32 group"
                    :label="$t('components.daily.trade_group.show_trades')"
                    color="neutral"
                    variant="subtle"
                    trailing-icon="i-lucide-chevron-down"
                    :ui="{
                        trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
                    }"
                    block
                />

                <template #content>
                    <div v-if="showTable">
                        <UDropdownMenu
                            class="flex justify-start"
                            :items="
                                table?.tableApi
                                    ?.getAllColumns()
                                    .filter((column) => column.getCanHide() && !['actions', 'symbol', 'type', 'profit'].includes(column.id))
                                    .map((column) => ({
                                        label: labelColumnsHeader[column.id] as string,
                                        type: 'checkbox' as const,
                                        checked: column.getIsVisible(),
                                        onUpdateChecked(checked: boolean) {
                                            table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                                        },
                                        onSelect(e?: Event) {
                                            e?.preventDefault()
                                        },
                                    }))
                            "
                            :content="{ align: 'start' }"
                        >
                            <UButton
                                class="ml-auto mr-2"
                                :label="$t('components.common.columns.button')"
                                color="neutral"
                                size="sm"
                                variant="outline"
                                trailing-icon="i-lucide-chevron-down"
                            />
                        </UDropdownMenu>
                    </div>
                    <UTable
                        ref="table"
                        :key="locale"
                        v-model:column-visibility="userStore.dailyHistoryFilters.columnVisibility"
                        :columns="columns"
                        :data="tableData"
                        :empty-state="{ icon: 'i-heroicons-document-text', label: $t('components.trade.table.no_trades.title') }"
                        :ui="{ td: 'p-2' }"
                    >
                        <template #symbol-cell="{ row }">
                            <span class="font-semibold">{{ row.original.symbol }}</span>
                        </template>
                        <template #account-cell="{ row }">
                            <span class="font-semibold">{{ row.original.account_displayName }}</span>
                        </template>
                        <template #profit-cell="{ row }">
                            <span class="font-semibold" :class="row.original.profit >= 0 ? 'text-green-600' : 'text-red-600'">
                                {{ formatCurrency(row.original.profit) }}
                            </span>
                        </template>
                        <template #type-cell="{ row }">
                            <UBadge :class="row.original.type === 'buy' ? 'dark:bg-green-300 bg-emerald-500' : 'dark:bg-red-300 bg-orange-500'">
                                {{ row.original.type === 'buy' ? $t('common.trade_types.buy') : $t('common.trade_types.sell') }}
                            </UBadge>
                        </template>
                        <template #openDate-cell="{ row }">
                            {{ formatHour(new Date(row.original.openDate), true, locale) }}
                        </template>
                        <template #closeDate-cell="{ row }">
                            {{ formatHour(new Date(row.original.closeDate), true, locale) }}
                        </template>
                        <template #openPrice-cell="{ row }">
                            <span class="font-semibold">
                                {{ row.original.openPrice.toFixed(getDigitFromSymbol(row.original.symbol, true)) }}
                            </span>
                        </template>
                        <template #closePrice-cell="{ row }">
                            <span class="font-semibold">
                                {{ row.original.closePrice.toFixed(getDigitFromSymbol(row.original.symbol, true)) }}
                            </span>
                        </template>
                        <template #note-cell="{ row }">
                            <div class="flex flex-wrap gap-1 md:min-w-120">
                                <UTooltip :text="row.original.note ?? ''">
                                    <UBadge
                                        v-if="row.original.note"
                                        class="cursor-pointer whitespace-normal"
                                        color="neutral"
                                        @click="openTradeTagModal(row.original)"
                                    >
                                        <span class="truncate1 break-words">{{ row.original.note }}</span>
                                    </UBadge>
                                </UTooltip>
                            </div>
                        </template>
                        <template #tags-cell="{ row }">
                            <div class="flex flex-wrap gap-1 md:min-w-44">
                                <UTooltip v-for="tag in row.original.tags" :key="tag.id" :text="tag.description || tag.name">
                                    <UBadge
                                        title=""
                                        :label="tag.name"
                                        :style="getTagStyle(tag)"
                                        class="cursor-pointer"
                                        @click="
                                            () => {
                                                openTradeTagModal(row.original)
                                            }
                                        "
                                    >
                                        {{ tag.name }}
                                    </UBadge>
                                </UTooltip>
                            </div>
                        </template>
                        <template #actions-cell="{ row }">
                            <div class="flex gap-2">
                                <UTooltip
                                    :text="
                                        row.original.note || row.original.tags?.length > 0
                                            ? $t('components.common.actions.edit_notes_tags')
                                            : $t('components.common.actions.add_notes_tags')
                                    "
                                >
                                    <UButton
                                        icon="i-heroicons-pencil-square"
                                        color="primary"
                                        variant="ghost"
                                        size="xs"
                                        @click="openTradeTagModal(row.original)"
                                    />
                                </UTooltip>
                                <UTooltip
                                    v-if="row.original.note || row.original.tags?.length > 0"
                                    :text="$t('components.common.actions.clear_notes_tags')"
                                >
                                    <UButton
                                        icon="i-heroicons-trash"
                                        color="error"
                                        variant="ghost"
                                        size="xs"
                                        @click="confirmClearTradeTags(row.original)"
                                    />
                                </UTooltip>
                            </div>
                        </template>
                    </UTable>
                </template>
            </UCollapsible>
        </div>

        <CommonModalScreenshotCarousel :open="showScreenshots" :screenshots="currentScreenshots" @closed="showScreenshots = false" />
    </UCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getWinLossNb, getWinrate, getPNL } from '~/utils/tradeStats'
import type { DayTagType } from '~/schema/dayTag'
import type { TradeExtendedType } from '~/schema/trade'
import { DashboardWinratePie, UIcon } from '#components'
import { formatCurrency, formatDateLong, formatHour } from '~/utils'
import { generateIntradayPnlChartData } from '~/utils/dashboard'

const { t, locale } = useI18n()

const UTooltipComp = resolveComponent('UTooltip')
const UButtonComp = resolveComponent('UButton')
const userStore = useUserStore()

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
})

const table = useTemplateRef('table')

const showDayTagModal = ref(false)
// État pour gérer l'affichage de la modal de captures d'écran
const showScreenshots = ref(false)
const currentScreenshots = ref<Array<{ id?: number; url: string }>>([])

const showTradeTagModal = ref(false)
const showClearTagsModal = ref(false)
const showClearDayTagsModal = ref(false)
const dayTag = ref<DayTagType | null>(null)
const selectedTrade = ref<TradeExtendedType | null>(null)

// Composable pour gérer les trades
const { getTagStyle } = useTags()
const { fetchTrade, updateTrade } = useTrades()
const { fetchSymbols, getDigitFromSymbol } = useSymbols()
const { getDayTagByDate, deleteDayTag } = useDayTags()
const { deleteTradeTags } = useTradeTags()

const winLoss = computed(() => getWinLossNb(props.groupTrades, props.groupDate || new Date()))
const winrate = computed(() => getWinrate(props.groupTrades, 1))
const pnl = computed(() => getPNL(props.groupTrades, 2))
// Données pour les graphiques
const intradayChartData = computed(() => {
    return generateIntradayPnlChartData(props.groupTrades)
})
// Données du tableau calculées uniquement lorsque le collapsible est ouvert
const tableData = computed<TradeExtendedType[]>(() => {
    return props.groupTrades
})

// Fonction pour ouvrir la modal des captures d'écran
const openScreenshotsModal = (screenshots: Array<{ id?: number; url: string }>) => {
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
        // Index signature is added via the type assertion below
    }
})

const columns = computed(() => {
    return [
        { id: 'symbol', accessorKey: 'symbol', header: labelColumnsHeader.value.symbol, meta: addMeta() },
        { id: 'account', accessorKey: 'account', header: labelColumnsHeader.value.account, meta: addMeta() },
        { id: 'type', accessorKey: 'type', header: labelColumnsHeader.value.type, meta: addMeta() },
        { id: 'lot', accessorKey: 'lot', header: labelColumnsHeader.value.lot, meta: addMeta() },
        { id: 'openDate', accessorKey: 'openDate', header: labelColumnsHeader.value.openHour, meta: addMeta() },
        { id: 'closeDate', accessorKey: 'closeDate', header: labelColumnsHeader.value.closeHour, meta: addMeta() },
        { id: 'openPrice', accessorKey: 'openPrice', header: labelColumnsHeader.value.openPrice, meta: addMeta() },
        { id: 'closePrice', accessorKey: 'closePrice', header: labelColumnsHeader.value.closePrice, meta: addMeta() },
        { id: 'profit', accessorKey: 'profit', header: labelColumnsHeader.value.profit, meta: addMeta() },
        { id: 'actions', header: labelColumnsHeader.value.actions, meta: addMeta('w-[100px]') },
        {
            id: 'screenshots',
            accessorKey: 'screenshots',
            header: () => h('div', { class: 'flex items-center' }, [h(UIcon, { name: 'i-lucide-image', class: 'w-4 h-4' })]),
            cell: ({ row }) => {
                const screenshots = row.original.screenshots || []
                const hasScreenshots = screenshots.length > 0 || row.original.screenshotUrl

                if (!hasScreenshots) return null

                // Si on a à la fois des captures dans le tableau et l'ancien screenshotUrl
                const allScreenshots = [
                    ...screenshots,
                    ...(row.original.screenshotUrl && !screenshots.some((s: { url: string }) => s.url === row.original.screenshotUrl)
                        ? [{ url: row.original.screenshotUrl }]
                        : []),
                ]

                return h('div', { class: 'flex justify-center items-center h-full' }, [
                    h(
                        UTooltipComp,
                        {
                            text:
                                allScreenshots.length > 1
                                    ? t('components.common.columns.screenshots.multiple', { count: allScreenshots.length })
                                    : t('components.common.columns.screenshots.single'),
                            class: 'flex items-center justify-center',
                        },
                        () =>
                            h(
                                UButtonComp,
                                {
                                    variant: 'ghost',
                                    color: 'neutral',
                                    icon: 'i-heroicons-photo',
                                    class: [
                                        'text-gray-500 dark:text-gray-400',
                                        'hover:text-primary-500 dark:hover:text-primary-400',
                                        'transition-colors duration-200',
                                    ],
                                    onClick: (e: Event) => {
                                        e.stopPropagation()
                                        openScreenshotsModal(allScreenshots)
                                    },
                                    'aria-label': t('components.common.columns.screenshots.aria_label'),
                                },
                                {}
                            )
                    ),
                ])
            },
            meta: addMeta('w-[40px]'),
        },
        { id: 'tags', accessorKey: 'tags', header: labelColumnsHeader.value.tags, meta: addMeta('') },
        { id: 'note', accessorKey: 'note', header: labelColumnsHeader.value.note, meta: addMeta() },
    ]
})

// Charger le DayTag pour la date courante si elle existe
const loadDayTag = async () => {
    if (!props.groupDate) return
    try {
        dayTag.value = await getDayTagByDate(props.groupDate)
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        log_error(message)
    }
}

// Ouvrir la modal pour ajouter/modifier un DayTag
const openDayTagModal = () => {
    showDayTagModal.value = true
}

// Gérer la sauvegarde d'un DayTag
const onDayTagSaved = (savedDayTag: DayTagType) => {
    dayTag.value = savedDayTag
}

// Ouvrir la modal pour modifier un trade et ses tags
const openTradeTagModal = (trade: TradeExtendedType) => {
    selectedTrade.value = trade
    showTradeTagModal.value = true
}

// Gérer la mise à jour des tags d'un trade
const onTradeTagsUpdated = async () => {
    const result = await fetchTrade(selectedTrade.value!.id)
    if (!result) return
    if (selectedTrade.value) {
        selectedTrade.value.note = result.note
        selectedTrade.value.tags = result.tags
        selectedTrade.value.screenshots = result.screenshots
        selectedTrade.value.screenshotUrl = result.screenshotUrl
    }
}

// Ouvrir la modal de confirmation pour effacer les notes et tags
const confirmClearTradeTags = (trade: TradeExtendedType) => {
    selectedTrade.value = trade
    showClearTagsModal.value = true
}

const confirmClearDayTradeTags = () => {
    showClearDayTagsModal.value = true
}

// Effacer les notes et tags d'un trade
const onClearTradeNoteTags = async () => {
    if (!selectedTrade.value || !selectedTrade.value.id) return

    try {
        await deleteTradeTags(selectedTrade.value.id)
        await updateTrade({
            id: selectedTrade.value.id,
            note: '',
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

const onClearDayNoteTags = async () => {
    try {
        if (!dayTag.value?.id) return
        await deleteDayTag(dayTag.value?.id)
        dayTag.value = null
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        log_error(message)
    }
}

// Charger le DayTag au montage du composant
onMounted(() => {
    loadDayTag()
})

// Recharger le DayTag si la date change
watch(
    () => props.groupDate,
    () => {
        if (props.groupDate) {
            loadDayTag()
        }
    }
)

const showTable = defineModel('showTable', { type: Boolean, default: false })
</script>
