<template>
    <div>
        <div v-if="showTable">
            <ColumnVisibilityMenu
                :table="table"
                :label-columns-header="labelColumnsHeader"
                :exclude-columns="['actionToggle', 'symbol', 'type', 'profit']"
                align="start"
                button-class="w-36"
            />
        </div>
        <UTable ref="table" :key="`${locale}-${timezoneKey}`"
            v-model:column-visibility="userStore.dailyHistoryFilters.columnVisibility"
            v-model:expanded="expanded"
            :columns="columns"
            :data="tableData"
            :empty-state="{ icon: 'i-heroicons-document-text', label: $t('components.trade.table.no_trades.title') }"
            :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
            class="custom-table-hover table-fixed">
            <template #actionToggle-cell="{ row }">
                <div class="action-buttons" :class="{ 'row-inactive': row.original.active === false }">
                    <CommonModalDelete v-if="row.original.active === false" :from="'trade'"
                        :title="$t('components.trade.table.activate_title')"
                        :confirm-text="$t('common.actions.confirm')" confirm-color="primary"
                        @confirm="emit('activate', row.original.id!)">
                        <template #trigger>
                            <UTooltip :text="$t('components.daily.trade_group.activate_button')">
                                <UButton icon="i-lucide-archive-restore" size="xs" color="primary"
                                    variant="ghost"></UButton>
                            </UTooltip>
                        </template>
                        <template #content>{{ $t('components.trade.table.activate_confirm') }}</template>
                    </CommonModalDelete>
                    <CommonModalDelete v-else :from="'trade'" @confirm="emit('deactivate', row.original.id!)">
                        <template #trigger>
                            <UTooltip :text="$t('components.daily.trade_group.deactivate_button')">
                                <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost">
                                </UButton>
                            </UTooltip>
                        </template>
                        <template #content>{{ $t('components.trade.table.deactivate_confirm') }}</template>
                    </CommonModalDelete>

                </div>
            </template>
            <template #symbol-cell="{ row }">
                <span class="font-semibold">{{ row.original.symbol }}</span>
            </template>
            <template #account-cell="{ row }">
                <span class="font-semibold">{{ row.original.account_displayName }}</span>
            </template>
            <template #profit-cell="{ row }">
                <span :class="(row.original.netProfit || 0) >= 0 ? 'profit-text' : 'loss-text'">
                    {{ formatCurrency(row.original.netProfit || 0) }}
                </span>
            </template>
            <template #grossProfit-cell="{ row }">
                <span :class="(row.original.profit || 0) >= 0 ? 'profit-text' : 'loss-text'">
                    {{ formatCurrency(row.original.profit || 0) }}
                </span>
            </template>
            <template #type-cell="{ row }">
                <UBadge :style="{
                    backgroundColor: tradeTypeColors[row.original.type],
                    color: 'white',
                }" :class="{ 'opacity-50': !row.original.active }">
                    {{ row.original.type === 'buy' ? $t('common.trade_types.buy') :
                        $t('common.trade_types.sell') }}
                </UBadge>
            </template>

            <template #openDate-cell="{ row }">
                <div class="flex flex-col">
                    <span class="text-secondary-xs">{{
                        formatDateWithUserTimezone(
                            row.original.openDate,
                            userStore.user?.settings_object!,
                            false,
                            locale as 'fr' | 'en' | 'us'
                        )
                    }}</span>
                    <span>{{
                        formatHourString(
                            new Date(row.original.openDate),
                            true,
                            locale as 'fr' | 'en' | 'us',
                            userStore.user?.settings_object?.timezoneDisplay,
                            userStore.user?.settings_object?.timezoneLocal,
                            userStore.user?.settings_object?.timezoneUtcOffset
                        )
                    }}</span>
                </div>
            </template>
            <template #closeDate-cell="{ row }">
                {{
                    formatHourString(
                        new Date(row.original.closeDate),
                        true,
                        locale as 'fr' | 'en' | 'us',
                        userStore.user?.settings_object?.timezoneDisplay,
                        userStore.user?.settings_object?.timezoneLocal,
                        userStore.user?.settings_object?.timezoneUtcOffset
                    )
                }}
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
                <div class="tag-container cell-wide">
                    <UTooltip :text="row.original.note ?? ''">
                        <UBadge v-if="row.original.note"
                            :class="row.original.active === false ? 'whitespace-normal opacity-50' : 'badge-clickable whitespace-normal'"
                            color="neutral"
                            @click="row.original.active !== false && emit('open-tag-modal', row.original)">
                            <span class="truncate1 break-words">{{ row.original.note }}</span>
                        </UBadge>
                    </UTooltip>
                </div>
            </template>
            <template #tags-cell="{ row }">
                <div class="tag-container cell-narrow">
                    <UTooltip v-for="tag in row.original.tags" :key="tag.id"
                        :text="tag.description || tag.name">
                        <UBadge title="" :label="tag.name" :style="getTagStyle(tag)"
                            :class="row.original.active === false ? 'opacity-50' : 'badge-clickable'"
                            @click="row.original.active !== false && emit('open-tag-modal', row.original)">
                            {{ tag.name }}
                        </UBadge>
                    </UTooltip>
                </div>
            </template>
            <template #actions-cell="{ row }">
                <div class="action-buttons">
                    <UTooltip :text="$t('components.daily.trade_group.view_details')">
                        <UButton icon="i-heroicons-eye" size="xs" color="neutral" variant="ghost"
                            :disabled="row.original.active === false"
                            @click="emit('open-detail-modal', row.original)"></UButton>
                    </UTooltip>
                    <UTooltip :text="row.original.note || row.original.tags?.length > 0
                            ? $t('components.common.actions.edit_notes_tags')
                            : $t('components.common.actions.add_notes_tags')
                        ">
                        <UButton icon="i-heroicons-pencil-square" color="primary" variant="ghost" size="xs"
                            :disabled="row.original.active === false"
                            @click="emit('open-tag-modal', row.original)" />
                    </UTooltip>
                    <UTooltip v-if="row.original.note || row.original.tags?.length > 0 || row.original.screenshots?.length > 0"
                        :text="$t('components.common.actions.clear_notes_tags')">
                        <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs"
                            :disabled="row.original.active === false"
                            @click="emit('clear-tags', row.original)" />
                    </UTooltip>
                </div>
            </template>
            <template #expanded="{ row }">
                <div class="flex gap-4 p-4 bg-old-neutral-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <!-- Actions - aligné avec Symbole -->
                    <div class="flex gap-2 items-center" style="margin-left: 80px;">
                        <span class="text-sm font-semibold text-gray-900 dark:text-white mr-2" :class="{ 'opacity-50': !row.original.active }">→</span>
                        <UTooltip :text="$t('components.daily.trade_group.view_details')">
                            <UButton icon="i-heroicons-eye" size="xs" color="neutral" variant="ghost"
                                :disabled="row.original.active === false"
                                @click="emit('open-detail-modal', row.original)"></UButton>
                        </UTooltip>
                        <UTooltip :text="row.original.note || row.original.tags?.length > 0
                                ? $t('components.common.actions.edit_notes_tags')
                                : $t('components.common.actions.add_notes_tags')
                            ">
                            <UButton icon="i-heroicons-pencil-square" color="primary" variant="ghost" size="xs"
                                :disabled="row.original.active === false"
                                @click="emit('open-tag-modal', row.original)" />
                        </UTooltip>
                        <UTooltip v-if="row.original.note || row.original.tags?.length > 0 || row.original.screenshots?.length > 0"
                            :text="$t('components.common.actions.clear_notes_tags')">
                            <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs"
                                :disabled="row.original.active === false"
                                @click="emit('clear-tags', row.original)" />
                        </UTooltip>
                    </div>

                    <!-- Screenshots -->
                    <div v-if="row.original.screenshots?.length > 0 || row.original.screenshotUrl" class="flex gap-2 items-center">
                        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 mr-2">Screenshots:</span>
                        <UButton icon="i-heroicons-photo" size="xs" color="neutral" variant="ghost"
                            @click="emit('open-screenshots', row.original)">
                            {{ row.original.screenshots?.length || 1 }}
                        </UButton>
                    </div>

                    <!-- Tags -->
                    <div v-if="row.original.tags?.length > 0" class="flex gap-2 items-center flex-wrap">
                        <span class="text-sm font-semibold text-gray-600 dark:text-gray-300 mr-2" :class="{ 'opacity-50': !row.original.active }">Tags:</span>
                        <UTooltip v-for="tag in row.original.tags" :key="tag.id"
                            :text="tag.description || tag.name">
                            <UBadge :label="tag.name" :style="getTagStyle(tag)"
                                :class="row.original.active === false ? 'opacity-50' : 'badge-clickable'"
                                @click="row.original.active !== false && emit('open-tag-modal', row.original)">
                                {{ tag.name }}
                            </UBadge>
                        </UTooltip>
                    </div>

                    <!-- Note -->
                    <div v-if="row.original.note" class="flex gap-2 items-center flex-1">
                        <span class="text-sm font-semibold text-gray-800 dark:text-gray-300 mr-2" :class="{ 'opacity-50': !row.original.active }">Note:</span>
                        <UTooltip :text="row.original.note">
                            <UBadge
                                :class="row.original.active === false ? 'whitespace-normal opacity-50' : 'badge-clickable whitespace-normal'"
                                color="neutral"
                                @click="row.original.active !== false && emit('open-tag-modal', row.original)">
                                <span class="truncate1 break-words">{{ row.original.note }}</span>
                            </UBadge>
                        </UTooltip>
                    </div>
                </div>
            </template>
        </UTable>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TradeExtendedType } from '~/schema/trade'
import { formatDateWithUserTimezone, formatHourString } from '~/utils/date-utils'

const { formatCurrency } = useUtils()
const { t, locale } = useI18n()

const userStore = useUserStore()
const { tradeTypeColors } = useTypeColors()
const { getDigitFromSymbol } = useSymbols()

const props = defineProps<{
    columns: any[]
    tableData: TradeExtendedType[]
    labelColumnsHeader: Record<string, string>
    showTable: boolean
    timezoneKey: string
    getTagStyle: (tag: any) => any
}>()

const emit = defineEmits<{
    activate: [id: number]
    deactivate: [id: number]
    'open-tag-modal': [trade: TradeExtendedType]
    'open-detail-modal': [trade: TradeExtendedType]
    'open-screenshots': [trade: TradeExtendedType]
    'clear-tags': [trade: TradeExtendedType]
}>()

const table = useTemplateRef('table')

// Initialiser toutes les lignes comme expandées par défaut
const expanded = computed(() => {
    const expandedState: Record<string, boolean> = {}
    props.tableData.forEach((_, index) => {
        expandedState[index.toString()] = true
    })
    return expandedState
})
</script>
