<template>
    <UInput
        v-model="modelValue"
        :class="classWidth"
        class="no-select"
        :placeholder="placeholder"
        :ui="{ trailing: 'pe-1' }"
        v-bind="$attrs"
        @keyup.enter="$emit('enter')"
    >
        <template v-if="hasValue" #trailing>
            <UButton color="neutral" variant="link" size="sm" icon="i-lucide-circle-x" aria-label="Clear input" @click="clearInput" />
        </template>
    </UInput>
</template>

<script setup lang="ts">
const modelValue = defineModel<string | number>('modelValue', { required: true })

defineProps({
    placeholder: {
        type: String,
        default: '',
    },
    classWidth: {
        type: String,
        default: 'min-w-[80px]',
    },
})

defineEmits<{
    enter: []
}>()

const clearInput = () => {
    modelValue.value = ''
}

const hasValue = computed(() => {
    if (typeof modelValue.value === 'string') return modelValue.value.length > 0
    if (Array.isArray(modelValue.value)) return modelValue.value.length > 0
    if (modelValue.value === null || modelValue.value === undefined) return false
    return String(modelValue.value).length > 0
})
</script>
