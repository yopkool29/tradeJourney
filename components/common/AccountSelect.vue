<template>
    <div class="flex flex-col gap-3">
        <div class='flex flex-col md:flex-row items-start gap-4'>
            <USelect
                :model-value="localValue"
                :items="items"
                :placeholder="localValue?.length ? '' : placeholder"
                multiple
                size="md"
                class="w-auto select-none"
                :ui="{ content: 'w-auto min-w-[var(--reka-select-trigger-width)]' }"
                :content="{ align: 'center', position: 'popper' }"
                @update:model-value="onSelectChange"
            >
                <div>
                    <span v-if="!localValue?.length">{{ allLabel }}</span>
                    <span v-else>{{ selectedLabel }}</span>
                </div>
            </USelect>
            <slot name="before-badges" />
        </div>
        <div v-if="localValue?.length && items?.length" class="flex flex-wrap gap-2 mx-4">
            <UBadge
                v-for="label in selectedLabels"
                :key="label"
                variant="subtle"
                color="neutral"
                class="cursor-pointer hover:opacity-70 transition-opacity"
                @click="onTagsChange(selectedLabels.filter(l => l !== label))"
            >
                {{ label }}
                <UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1" />
            </UBadge>
        </div>
    </div>
</template>

<script setup lang="ts">

interface SelectItem {
    label: string
    value: number
}

const props = defineProps<{
    modelValue: number[]
    items: SelectItem[]
    placeholder: string
    allLabel: string
    selectedLabel: string
    selectClass?: string
}>()

const emit = defineEmits<{
    'update:modelValue': [value: number[]]
}>()

const localValue = ref<number[]>(props.modelValue)

watch(() => props.modelValue, (val) => {
    localValue.value = val
})

const selectedLabels = computed(() =>
    (localValue.value ?? []).map(id => props.items.find(i => i.value === id)?.label ?? String(id))
)

const debouncedEmit = useDebounce((val: number[]) => {
    emit('update:modelValue', val)
}, 1000)

const onSelectChange = (val: number[]) => {
    localValue.value = val
    debouncedEmit(val)
}

watch(() => props.items, (items) => {
    if (!items?.length) return
    const validIds = (props.modelValue ?? []).filter(id => items.some(i => i.value === id))
    if (validIds.length !== (props.modelValue ?? []).length) {
        emit('update:modelValue', validIds)
    }
}, { immediate: true })

const onTagsChange = (labels: string[]) => {
    const ids = labels
        .map(label => props.items.find(i => i.label === label)?.value)
        .filter((id): id is number => id !== undefined)
    localValue.value = ids
    debouncedEmit(ids)
}

</script>
