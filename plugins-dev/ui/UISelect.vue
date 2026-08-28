<template>
    <select
        :id="props.id"
        :class="selectClasses"
        :disabled="props.disabled"
        :value="props.modelValue"
        @change="onChange"
    >
        <option v-if="props.placeholder" :value="null" disabled>{{ props.placeholder }}</option>
        <option v-for="option in props.options" :key="String(option.value)" :value="option.value">
            {{ option.label }}
        </option>
    </select>
</template>

<script setup lang="ts">
interface SelectOption {
    value: string | number | null
    label: string
}

const props = withDefaults(
    defineProps<{
        id?: string
        options: SelectOption[]
        modelValue?: string | number | null
        placeholder?: string
        size?: 'sm' | 'md' | 'lg'
        disabled?: boolean
    }>(),
    {
        id: undefined,
        modelValue: null,
        placeholder: undefined,
        size: 'md',
        disabled: false,
    }
)

const emit = defineEmits<{
    'update:modelValue': [value: string | number | null]
}>()

const onChange = (event: Event) => {
    const target = event.target as HTMLSelectElement
    const raw = target.value
    if (raw === '') {
        emit('update:modelValue', null)
        return
    }
    const num = Number(raw)
    emit('update:modelValue', isNaN(num) ? raw : num)
}

const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
}

const selectClasses = [
    'w-full rounded-md border border-default',
    'bg-elevated text-default',
    'focus:outline-none focus:border-primary',
    'disabled:cursor-not-allowed disabled:opacity-75',
    sizeClasses[props.size],
].join(' ')
</script>
