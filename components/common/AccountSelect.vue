<template>
    <div class="flex flex-col gap-1">
        <USelect
            :model-value="modelValue"
            :items="items"
            :placeholder="placeholder"
            multiple
            :class="selectClass"
            @update:model-value="$emit('update:modelValue', $event)"
        >
            <div>
                <span v-if="!modelValue?.length">{{ allLabel }}</span>
                <span v-else>{{ selectedLabel }}</span>
            </div>
        </USelect>
        <div v-if="modelValue?.length" class="flex items-center gap-1 flex-wrap">
            <template v-for="id in displayedIds" :key="id">
                <UBadge color="primary" variant="soft" size="sm">
                    {{ getLabelForId(id) }}
                </UBadge>
            </template>
            <span v-if="modelValue.length > maxBadges" class="text-xs text-gray-500 dark:text-gray-400">
                +{{ modelValue.length - maxBadges }}
            </span>
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
    maxBadges?: number
}>()

defineEmits<{
    'update:modelValue': [value: number[]]
}>()

const maxBadges = computed(() => props.maxBadges ?? 3)

const displayedIds = computed(() => props.modelValue?.slice(0, maxBadges.value) ?? [])

const getLabelForId = (id: number) => {
    return props.items.find(item => item.value === id)?.label ?? String(id)
}
</script>
