<template>
    <div>
        <UInputMenu
            v-if="!multiple"
            :model-value="selectedItems[0] ?? null"
            :items="symbolItems"
            :placeholder="$t('components.trade.table.filters.symbol_placeholder')"
            class="min-w-[160px]"
            @update:model-value="onSelectSingle"
        />
        <UPopover v-if="multiple" v-model:open="isOpen">
            <template #default>
                <div class="inline-flex items-center gap-2 cursor-pointer">
                    <template v-if="selectedValues?.length > 0">
                        <UBadge
                            v-for="item in displayedSymbols"
                            :key="item.value"
                            class="cursor-pointer"
                            size="md"
                            color="neutral"
                            variant="subtle"
                        >
                            {{ item.label }}
                            <UIcon name="i-heroicons-x-mark" class="ml-1" @click.stop="removeSymbol(item.value)" />
                        </UBadge>
                        <UTooltip v-if="hiddenSymbolsCount > 0" :text="hiddenSymbolNames">
                            <UBadge
                                class="cursor-pointer"
                                size="md"
                                color="neutral"
                                variant="subtle"
                            >
                                +{{ hiddenSymbolsCount }}
                            </UBadge>
                        </UTooltip>
                    </template>
                    <UButton
                        v-else
                        icon="i-lucide-list"
                        variant="outline"
                        size="sm"
                        color="neutral"
                    >
                        {{ $t('components.trade.table.filters.symbol_placeholder') }}
                    </UButton>
                </div>
            </template>
            <template #content>
                <div class="p-4 w-96">
                    <div class="action-buttons mb-4">
                        <UButton size="sm" @click="confirmSelection">{{ $t('common.actions.validate') }}</UButton>
                        <UButton size="sm" variant="soft" @click="cancelSelection">{{ $t('common.actions.cancel') }}</UButton>
                    </div>
                    <UInputMenu
                        :model-value="popoverSelectedItems"
                        :items="symbolItems"
                        multiple
                        :placeholder="$t('components.trade.table.filters.symbol_placeholder')"
                        @update:model-value="onPopoverSelect"
                    />
                </div>
            </template>
        </UPopover>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    modelValue: string | string[]
    multiple?: boolean
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string | string[]]
}>()

const { symbols, fetchActiveSymbols } = useSymbols()

onMounted(async () => {
    await fetchActiveSymbols()
    const activeSymbolValues = symbols.value.map(s => s.symbol)
    if (Array.isArray(props.modelValue)) {
        const filtered = props.modelValue.filter(v => activeSymbolValues.includes(v))
        if (filtered.length !== props.modelValue.length) {
            emit('update:modelValue', filtered)
        }
    } else if (props.modelValue && !activeSymbolValues.includes(props.modelValue as string)) {
        emit('update:modelValue', '')
    }
})

type SymbolItem = { label: string; value: string }

const symbolItems = computed<SymbolItem[]>(() =>
    symbols.value.map(s => ({ label: s.symbol, value: s.symbol }))
)

const selectedValues = computed<string[]>(() => {
    return Array.isArray(props.modelValue)
        ? props.modelValue.filter(Boolean)
        : props.modelValue ? [props.modelValue as string] : []
})

const selectedItems = computed<SymbolItem[]>(() => {
    return selectedValues.value.map(v => ({ label: v, value: v }))
})

const onSelectSingle = (val: SymbolItem | null) => {
    emit('update:modelValue', val ? val.value : '')
}

// Popover pattern for multiple selection
const isOpen = ref(false)
const popoverSelectedValues = ref<string[]>([])

// Initialiser les valeurs à l'ouverture du popover
watch(isOpen, (open) => {
    if (open) {
        popoverSelectedValues.value = [...selectedValues.value]
    }
})

const popoverSelectedItems = computed<SymbolItem[]>(() =>
    popoverSelectedValues.value.map(v => ({ label: v, value: v }))
)

const onPopoverSelect = (val: SymbolItem[] | null) => {
    popoverSelectedValues.value = val ? val.map(v => v.value) : []
}

const confirmSelection = () => {
    emit('update:modelValue', [...popoverSelectedValues.value])
    isOpen.value = false
}

const cancelSelection = () => {
    isOpen.value = false
}

const removeSymbol = (value: string) => {
    const current = selectedValues.value.filter(v => v !== value)
    emit('update:modelValue', current)
}

const maxDisplayChars = 50

const { displayedItems: displayedSymbols, hiddenCount: hiddenSymbolsCount, hiddenLabels: hiddenSymbolNames } = useTruncatedList({
    getItems: () => selectedItems.value,
    getLabel: (item) => item.label,
    maxChars: maxDisplayChars,
})
</script>
