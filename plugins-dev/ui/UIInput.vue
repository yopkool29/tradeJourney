<template>
    <input
        :id="props.id"
        type="file"
        :class="[baseClasses, sizeClass, colorClass, variantClass]"
        :disabled="props.disabled"
        @change="props.onChange"
    />
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        id?: string
        color?: 'primary' | 'green' | 'red'
        variant?: 'solid' | 'ghost'
        size?: 'sm' | 'md' | 'lg'
        disabled?: boolean
        onChange?: (event: Event) => void
    }>(),
    {
        id: undefined,
        color: 'primary',
        variant: 'solid',
        size: 'md',
        disabled: false,
        onChange: undefined,
    }
)

const colorClasses = {
    primary: 'file:bg-primary file:text-white hover:file:bg-primary/80',
    green: 'file:bg-green-500 file:text-white hover:file:bg-green-600',
    red: 'file:bg-red-500 file:text-white hover:file:bg-red-600',
}

const variantClasses = {
    solid: '',
    ghost: 'file:bg-transparent file:hover:bg-gray-100 dark:file:hover:bg-gray-800',
}

const sizeClasses = {
    sm: 'file:py-1.5 file:px-2.5 file:text-sm',
    md: 'file:py-2 file:px-4 file:text-sm',
    lg: 'file:py-3 file:px-6 file:text-base',
}

const baseClasses = 'block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:font-semibold disabled:cursor-not-allowed disabled:opacity-75'

const colorClass = colorClasses[props.color]
const variantClass = variantClasses[props.variant]
const sizeClass = sizeClasses[props.size]

</script>
