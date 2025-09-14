<template>
    <UCard class="mb-8">
        <template #header>
            <div class="flex flex-col justify-between items-start gap-4">
                <span class="font-bold text-lg">{{ $t('components.settings.tradingSymbols.title') }}</span>
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
                            <div class="flex flex-col gap-4">
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
                                        :placeholder="$t('components.settings.tradingSymbols.notes_placeholder')"
                                    />
                                </UFormField>
                            </div>
                        </UForm>
                    </template>
                    <template #footer>
                        <div class="flex gap-2 justify-end">
                            <UButton type="submit" form="createSymbolForm1" color="primary">{{
                                $t('common.actions.save')
                            }}</UButton>
                            <UButton type="button" color="neutral" variant="soft" @click.prevent="showAddSymbol = false">{{
                                $t('common.actions.cancel')
                            }}</UButton>
                        </div>
                    </template>
                </CommonModalDefault>
            </div>
        </template>
        <div class="p-4">
            <p class="text-gray-600 dark:text-gray-400 mb-6">
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

            <!-- Liste des symboles -->
            <div v-if="symbols.length">
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
                        <span class="text-gray-600 dark:text-gray-400">{{ row.original.notes || '—' }}</span>
                    </template>
                    <template #createdAt-cell="{ row }">
                        {{ formatDate(row.original.createdAt, false, locale) }}
                    </template>
                    <template #actions-cell="{ row }">
                        <div class="flex gap-2">
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
            <div v-else class="p-8 text-center text-gray-500 dark:text-gray-400">
                <p class="text-lg mb-2">{{ $t('components.settings.tradingSymbols.no_symbols') }}</p>
                <p class="text-sm">{{ $t('components.settings.tradingSymbols.no_symbols_description') }}</p>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { formatDate } from '~/utils'
import { CreateSymbolSchema } from '~/schema/symbol'
import type { CreateSymbolType, SymbolType, UpdateSymbolType } from '~/schema/symbol'

const { t, locale } = useI18n()

const { log_error } = useLogView()

const errorStr = ref<string | null>(null)
const successStr = ref<string | null>(null)

const displayMessage = (success: string | null, error: string | null) => {
    successStr.value = success || null
    errorStr.value = error || null
    if (error) log_error(error)
}

const getDefaultSymbol = () => ({ symbol: '', digit: 2, notes: null, active: true, userId: 0 }) // À adapter selon le contexte utilisateur

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
        { id: 'createdAt', accessorKey: 'createdAt', header: t('components.settings.tradingSymbols.columns.createdAt'), meta: addMeta() },
        { id: 'notes', accessorKey: 'notes', header: t('components.settings.tradingSymbols.columns.notes') },
    ]
})

const { fetchSymbols, createSymbol, updateSymbol, deleteSymbol: deleteSymbol_, symbols } = useSymbols()

onMounted(fetchSymbols)

// Pagination pour UTable
const pageSize = 10
const page = ref(1)

const pageCount = computed(() => Math.max(1, Math.ceil(symbols.value.length / pageSize)))

const paginatedSymbols = computed(() => {
    const start = (page.value - 1) * pageSize
    const end = page.value * pageSize
    return symbols.value.slice(start, end)
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
        const { tag, message } = catchTagMessage(err, t)
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
        const { tag, message } = catchTagMessage(err, t)
        errorStr.value = message
        log_error(message)
    }
}

async function onToggleSymbolStatus(symbol: UpdateSymbolType) {
    try {
        await updateSymbol({ id: symbol.id, active: !symbol.active })
        await fetchSymbols()
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        errorStr.value = message
        log_error(message)
    }
}
</script>
