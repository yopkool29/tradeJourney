<template>
    <UCard class="card-container-2xl">
        <template #header>
            <div class="header-layout">
                <span class="section-title">{{ $t('components.settings.tradingSymbols.title') }}</span>
                <CommonModalDefault
                    v-model:open="showAddSymbol"
                    :title="
                        editingSymbolId
                            ? $t('components.settings.tradingSymbols.edit_symbol_modal')
                            : $t('components.settings.tradingSymbols.add_symbol_modal')
                    "
                >
                    <template #trigger>
                        <UButton icon="i-lucide-plus" size="xs" @click="newSymbol()">{{
                            $t('components.settings.tradingSymbols.new_symbol')
                        }}</UButton>
                    </template>
                    <template #content>
                        <UForm
                            id="createSymbolForm1"
                            :state="newSymbolState"
                            :schema="CreateSymbolSchema"
                            :validate-on="['change', 'input']"
                            @submit.prevent="submitSymbol"
                        >
                            <div class="form-fields-container">
                                <UFormField name="symbol" :label="$t('components.settings.tradingSymbols.symbol_label')" required>
                                    <UInput
                                        v-model="newSymbolState.symbol"
                                        :placeholder="$t('components.settings.tradingSymbols.symbol_placeholder')"
                                        autofocus
                                    />
                                </UFormField>
                                <UFormField name="digit" :label="$t('components.settings.tradingSymbols.digit_label')">
                                    <UInput
                                        v-model="newSymbolState.digit"
                                        :placeholder="$t('components.settings.tradingSymbols.digit_placeholder')"
                                    />
                                </UFormField>
                                <UFormField name="pricePerPoint" :label="$t('components.settings.tradingSymbols.price_per_point_label')">
                                    <UInput
                                        v-model="newSymbolState.pricePerPoint"
                                        :placeholder="$t('components.settings.tradingSymbols.price_per_point_placeholder')"
                                    />
                                </UFormField>
                                <UFormField name="notes" :label="$t('components.settings.tradingSymbols.notes_label')">
                                    <UInput
                                        v-model="newSymbolState.notes"
                                        class="md:w-2/3"
                                        :placeholder="$t('components.settings.tradingSymbols.notes_placeholder')"
                                    />
                                </UFormField>
                                <UFormField name="aliases" :label="$t('components.settings.tradingSymbols.aliases_label')">
                                    <UInput
                                        v-model="newSymbolState.aliases"
                                        class="md:w-2/3"
                                        :placeholder="$t('components.settings.tradingSymbols.aliases_placeholder')"
                                    />
                                </UFormField>
                            </div>
                        </UForm>
                    </template>
                    <template #footer>
                        <div class="action-buttons-end">
                            <UButton type="submit" form="createSymbolForm1" color="primary">{{ $t('common.actions.save') }}</UButton>
                            <UButton type="button" color="neutral" variant="soft" @click.prevent="showAddSymbol = false">{{
                                $t('common.actions.cancel')
                            }}</UButton>
                        </div>
                    </template>
                </CommonModalDefault>
            </div>
        </template>
        <div class="p-4">
            <p class="text-secondary mb-6">
                {{ $t('components.settings.tradingSymbols.description') }}
            </p>

            <UAlert
                v-if="errorStr"
                icon="i-lucide-message-circle-warning"
                class="mb-8"
                :description="errorStr || ''"
                color="error"
                variant="outline"
            />
            <UAlert
                v-if="successStr"
                icon="i-lucide-message-circle-check"
                class="mb-8"
                :description="successStr || ''"
                color="success"
                variant="outline"
            />

            <!-- Filtres avancés -->
            <CommonAdvancedFilters
                v-model="filters"
                :columns="filterableColumnsConfig"
                :loading="filterLoading"
                @add="addFilter"
                @remove="removeFilter"
                @apply="onApplyFilters"
                @reset="resetFilters"
            >
                <template #field-active="{ filter, onValueChange }">
                    <USelect
                        :model-value="filter.value as string"
                        :items="[
                            { label: $t('components.settings.tradingSymbols.active'), value: 'true' },
                            { label: $t('components.settings.tradingSymbols.inactive'), value: 'false' },
                        ]"
                        :placeholder="$t('components.settings.tradingSymbols.columns.active')"
                        class="min-w-[200px]"
                        @update:model-value="onValueChange"
                    />
                </template>
            </CommonAdvancedFilters>

            <!-- Liste des symboles -->
            <div v-if="symbols.length" class="mt-6">
                <UTable :key="locale" :data="paginatedSymbols" :columns="columns" class="w-full">
                    <template #symbol-cell="{ row }">
                        <span class="font-medium">{{ row.original.symbol }}</span>
                    </template>
                    <template #active-cell="{ row }">
                        <UBadge :color="row.original.active ? 'success' : 'neutral'">
                            {{
                                row.original.active
                                    ? $t('components.settings.tradingSymbols.active')
                                    : $t('components.settings.tradingSymbols.inactive')
                            }}
                        </UBadge>
                    </template>
                    <template #notes-cell="{ row }">
                        <span class="text-secondary">{{ row.original.notes || '—' }}</span>
                    </template>
                    <template #createdAt-cell="{ row }">
                        {{ formatDateWithUserTimezone(row.original.createdAt, settings, false, locale as 'fr' | 'en' | 'us') }}
                    </template>
                    <template #actions-cell="{ row }">
                        <div class="action-buttons">
                            <UTooltip :text="$t('components.settings.tradingSymbols.edit')">
                                <UButton
                                    icon="i-heroicons-pencil-square"
                                    color="primary"
                                    size="xs"
                                    variant="ghost"
                                    @click="editSymbol(row.original)"
                                    >{{ $t('components.settings.tradingSymbols.edit') }}</UButton
                                >
                            </UTooltip>
                            <UTooltip
                                :text="
                                    row.original.active
                                        ? $t('components.settings.tradingSymbols.disable')
                                        : $t('components.settings.tradingSymbols.enable')
                                "
                            >
                                <UButton :color="row.original.active ? 'neutral' : 'success'" size="xs" @click="onToggleSymbolStatus(row.original)">
                                    {{
                                        row.original.active
                                            ? $t('components.settings.tradingSymbols.disable')
                                            : $t('components.settings.tradingSymbols.enable')
                                    }}
                                </UButton>
                            </UTooltip>
                            <CommonModalDelete @confirm="onDelete(row.original.id)">
                                <template #trigger>
                                    <UTooltip :text="$t('common.actions.delete')">
                                        <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost" />
                                    </UTooltip>
                                </template>
                                <template #content> {{ $t('components.settings.tradingSymbols.confirm_delete') }} </template>
                            </CommonModalDelete>
                        </div>
                    </template>
                </UTable>
                <div v-if="paginatedSymbols.length" class="mt-4 flex justify-center">
                    <UPagination
                        v-model:page="page"
                        :page-count="pageCount"
                        :total="symbols.length"
                        :items-per-page="pageSize"
                        :ui="{
                            root: '',
                            item: 'min-w-[32px] mx-[5px] !rounded-full justify-center',
                        }"
                    />
                </div>
            </div>
            <div v-else class="p-8 text-center text-secondary">
                <p class="text-lg mb-2">{{ $t('components.settings.tradingSymbols.no_symbols') }}</p>
                <p class="text-sm">{{ $t('components.settings.tradingSymbols.no_symbols_description') }}</p>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { formatDateWithUserTimezone } from '~/utils/date-utils'
import { CreateSymbolSchema } from '~/schema/symbol'
import type { CreateSymbolType, SymbolType, UpdateSymbolType } from '~/schema/symbol'
import type { SettingsContentType } from '~/schema/user'
import type { TradeFilter, FilterColumn } from '~/type'

const userStore = useUserStore()
const settings = userStore.user?.settings_object as SettingsContentType

const { t, locale } = useI18n()

const { log_error } = useLogView()

const errorStr = ref<string | null>(null)
const successStr = ref<string | null>(null)

const displayMessage = (success: string | null, error: string | null) => {
    successStr.value = success || null
    errorStr.value = error || null
    if (error) log_error(error)
}

const getDefaultSymbol = () => ({ symbol: '', digit: 2, notes: null, aliases: '', active: true, userId: 0 }) // À adapter selon le contexte utilisateur

const newSymbolState = ref<Partial<SymbolType>>(getDefaultSymbol())
const editingSymbolId = ref<number | null>(null)
const showAddSymbol = ref(false)

const addMeta = (defaultClass: string = 'w-[80px]') => {
    return {
        class: {
            td: defaultClass,
        },
    }
}

const columns = computed(() => {
    return [
        { id: 'actions', accessorKey: 'id', header: t('components.settings.tradingSymbols.columns.actions'), meta: addMeta() },
        { id: 'symbol', accessorKey: 'symbol', header: t('components.settings.tradingSymbols.columns.symbol'), meta: addMeta() },
        { id: 'digit', accessorKey: 'digit', header: t('components.settings.tradingSymbols.columns.digit'), meta: addMeta() },
        { id: 'pricePerPoint', accessorKey: 'pricePerPoint', header: t('components.settings.tradingSymbols.columns.pricePerPoint'), meta: addMeta() },
        { id: 'active', accessorKey: 'active', header: t('components.settings.tradingSymbols.columns.active'), meta: addMeta() },
        { id: 'aliases', accessorKey: 'aliases', header: t('components.settings.tradingSymbols.columns.aliases') },
        { id: 'createdAt', accessorKey: 'createdAt', header: t('components.settings.tradingSymbols.columns.createdAt'), meta: addMeta() },
        { id: 'notes', accessorKey: 'notes', header: t('components.settings.tradingSymbols.columns.notes') },
    ]
})

const { fetchSymbols, createSymbol, updateSymbol, deleteSymbol: deleteSymbol_, symbols } = useSymbols()

onMounted(() => {
    fetchSymbols()
})

// Filtres avancés
const filters = ref<TradeFilter[]>([{ column: 'symbol', operator: '=', value: '' }])
const filterLoading = ref(false)

const filterableColumnsConfig = computed<FilterColumn[]>(() => [
    {
        label: t('components.settings.tradingSymbols.columns.symbol'),
        value: 'symbol',
        dataType: 'text',
        operators: ['=', '!='],
        defaultOperator: '=',
    },
    {
        label: t('components.settings.tradingSymbols.columns.active'),
        value: 'active',
        dataType: 'select',
        operators: ['='],
        defaultOperator: '=',
        defaultValue: 'true',
    },
    {
        label: t('components.settings.tradingSymbols.columns.aliases'),
        value: 'aliases',
        dataType: 'text',
        operators: ['=', '!='],
        defaultOperator: '=',
    },
])

const addFilter = () => {
    if (filters.value.length < 2) {
        filters.value.push({ column: 'symbol', operator: '=', value: '' })
    }
}

const removeFilter = (index: number) => {
    filters.value.splice(index, 1)
}

const resetFilters = () => {
    filters.value = [{ column: 'symbol', operator: '=', value: '' }]
    applyFilters()
}

const applyFilters = () => {
    // Les filtres sont appliqués via computed filteredSymbols
}

const onApplyFilters = () => {
    filterLoading.value = true
    setTimeout(() => {
        applyFilters()
        filterLoading.value = false
    }, 100)
}

// Filtrage des symboles
const filteredSymbols = computed(() => {
    return symbols.value.filter((symbol) => {
        return filters.value.every((filter) => {
            if (!filter.value && filter.value !== false) return true

            const symbolValue = symbol[filter.column as keyof typeof symbol]
            const filterValue = filter.value

            switch (filter.operator) {
                case '=':
                    if (filter.column === 'active') {
                        return symbol.active === (filterValue === 'true')
                    }
                    return String(symbolValue).toLowerCase().includes(String(filterValue).toLowerCase())
                case '!=':
                    if (filter.column === 'active') {
                        return symbol.active !== (filterValue === 'true')
                    }
                    return !String(symbolValue).toLowerCase().includes(String(filterValue).toLowerCase())
                default:
                    return true
            }
        })
    })
})

// Pagination pour UTable
const pageSize = 10
const page = ref(1)

const pageCount = computed(() => Math.max(1, Math.ceil(filteredSymbols.value.length / pageSize)))

const paginatedSymbols = computed(() => {
    const start = (page.value - 1) * pageSize
    const end = page.value * pageSize
    return filteredSymbols.value.slice(start, end)
})

watch([page, pageCount], () => {
    if (page.value > pageCount.value) {
        page.value = pageCount.value
    }
})

function newSymbol() {
    displayMessage(null, null)
    editingSymbolId.value = null
    newSymbolState.value = getDefaultSymbol()
    showAddSymbol.value = true
}

function editSymbol(symbol: SymbolType) {
    displayMessage(null, null)
    editingSymbolId.value = symbol.id
    newSymbolState.value = { ...symbol }
    showAddSymbol.value = true
}

async function submitSymbol(event: FormSubmitEvent<CreateSymbolType | UpdateSymbolType>) {
    try {
        if (editingSymbolId.value) {
            // Edition
            await updateSymbol(event.data as UpdateSymbolType)
            displayMessage(t('components.settings.tradingSymbols.symbol_updated'), null)
        } else {
            // Création
            await createSymbol(event.data as CreateSymbolType)
            displayMessage(t('components.settings.tradingSymbols.symbol_created'), null)
        }
        await fetchSymbols()
        editingSymbolId.value = null
        showAddSymbol.value = false
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        errorStr.value = message
        log_error(message)
    }
}

async function onDelete(id: number) {
    try {
        await deleteSymbol_(id)
        await fetchSymbols()
        displayMessage(t('components.settings.tradingSymbols.symbol_deleted'), null)
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        errorStr.value = message
        log_error(message)
    }
}

async function onToggleSymbolStatus(symbol: UpdateSymbolType) {
    try {
        await updateSymbol({ id: symbol.id, active: !symbol.active })
        await fetchSymbols()
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        errorStr.value = message
        log_error(message)
    }
}
</script>
