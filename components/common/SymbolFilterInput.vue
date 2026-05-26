<template>
    <UInputMenu
        v-if="multiple"
        :model-value="selectedItems"
        :items="symbolItems"
        multiple
        :placeholder="$t('components.trade.table.filters.symbol_placeholder')"
        class="min-w-[160px]"
        @update:model-value="onSelectMultiple"
    />
    <UInputMenu
        v-else
        :model-value="selectedItems[0] ?? null"
        :items="symbolItems"
        :placeholder="$t('components.trade.table.filters.symbol_placeholder')"
        class="min-w-[160px]"
        @update:model-value="onSelectSingle"
    />
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

const selectedItems = computed<SymbolItem[]>(() => {
    const values = Array.isArray(props.modelValue)
        ? props.modelValue.filter(Boolean)
        : props.modelValue ? [props.modelValue as string] : []
    return values.map(v => ({ label: v, value: v }))
})

const onSelectMultiple = (val: SymbolItem[] | null) => {
    emit('update:modelValue', val ? val.map(v => v.value) : [])
}

const onSelectSingle = (val: SymbolItem | null) => {
    emit('update:modelValue', val ? val.value : '')
}
</script>
