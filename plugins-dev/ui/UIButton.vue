<template>
    <button
        :class="[baseClasses, sizeClass, colorClass, variantClass]"
        :disabled="props.disabled"
        @click="props.onClick"
    >
        <slot />
    </button>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        color?: 'primary' | 'green' | 'red'
        variant?: 'solid' | 'ghost'
        size?: 'sm' | 'md' | 'lg'
        disabled?: boolean
        onClick?: () => void
    }>(),
    {
        color: 'primary',
        variant: 'solid',
        size: 'md',
        disabled: false,
        onClick: undefined,
    }
)

const colorClasses = {
    primary: 'bg-primary text-white hover:bg-primary/75 active:bg-primary/75',
    green: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700',
    red: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
}

const variantClasses = {
    solid: '',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
}

const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
}

const baseClasses = 'rounded-md font-medium inline-flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-75 cursor-pointer user-select-none transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary gap-1.5'

const colorClass = colorClasses[props.color]
const variantClass = variantClasses[props.variant]
const sizeClass = sizeClasses[props.size]
</script>
