<template>
    <div class="flex flex-col gap-1">
        <div>
            <USelect
                :model-value="modelValue"
                :items="items"
                :placeholder="modelValue?.length ? '' : placeholder"
                multiple
                size="md"
                class="w-auto select-none"
                :ui="{ content: 'w-auto min-w-[var(--reka-select-trigger-width)]' }"
                :content="{ align: 'center', position: 'popper' }"
                @update:model-value="$emit('update:modelValue', $event)"
            >
                <div>
                    <span v-if="!modelValue?.length">{{ allLabel }}</span>
                    <span v-else>{{ selectedLabel }}</span>
                </div>
            </USelect>
        </div>
        <div>
        <UInputTags
            v-if="modelValue?.length"
            :model-value="selectedLabels"
            readonly
            class="mr-8"
            @update:model-value="onTagsChange"
        />
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

const selectedLabels = computed(() =>
    (props.modelValue ?? []).map(id => props.items.find(i => i.value === id)?.label ?? String(id))
)

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
    emit('update:modelValue', ids)
}
</script>
