<template>
    <div v-if="props.type === 'file'" class="relative">
        <input
            :id="props.id"
            type="file"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            :disabled="props.disabled"
            @change="props.onChange"
        />
        <div
            :class="[
                'flex items-center justify-center',
                'px-4 py-2 rounded-md font-medium text-sm',
                'cursor-pointer transition-colors duration-200',
                'border',
                sizeClass,
                colorClass,
                variantClass,
                props.disabled ? 'opacity-75 cursor-not-allowed' : ''
            ]"
            :style="fileStyle"
        >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Choose File
        </div>
    </div>
    <input
        v-else
        :id="props.id"
        :type="props.type"
        :class="inputClasses"
        :style="inputStyle"
        :disabled="props.disabled"
        :value="props.modelValue"
        @input="onInput"
    />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePluginTheme } from './usePluginTheme'

const props = withDefaults(
    defineProps<{
        id?: string
        type?: string
        color?: 'primary' | 'green' | 'red'
        variant?: 'solid' | 'ghost'
        size?: 'sm' | 'md' | 'lg'
        disabled?: boolean
        modelValue?: string | number
        onChange?: (event: Event) => void
    }>(),
    {
        id: undefined,
        type: 'text',
        color: 'primary',
        variant: 'solid',
        size: 'md',
        disabled: false,
        modelValue: undefined,
        onChange: undefined,
    }
)

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const onInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    emit('update:modelValue', target.value)
}

const colorClasses = {
    primary: 'bg-primary hover:bg-primary/75 active:bg-primary/75',
    green: 'bg-green-500 hover:bg-green-600 active:bg-green-700',
    red: 'bg-red-500 hover:bg-red-600 active:bg-red-700',
}

const variantClasses = {
    solid: '',
    ghost: 'file:bg-transparent file:hover:bg-elevated',
}

const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
}

const colorClass = colorClasses[props.color]
const variantClass = variantClasses[props.variant]
const sizeClass = sizeClasses[props.size]

const { isDark } = usePluginTheme()

const fileStyle = computed(() => ({
    color: isDark() ? '#1f1c28' : '#ffffff',
}))

const inputStyle = computed(() => ({
    backgroundColor: isDark() ? '#1f2937' : '#ffffff',
    color: isDark() ? '#e5e7eb' : '#111827',
    borderColor: isDark() ? '#374151' : '#d1d5db',
}))

const inputSizeClasses = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
}

const inputClasses = [
    'w-full rounded-md border',
    'focus:outline-none focus:border-primary',
    'disabled:cursor-not-allowed disabled:opacity-75',
    inputSizeClasses[props.size],
].join(' ')

</script>
