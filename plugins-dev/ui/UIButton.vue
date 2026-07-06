<template>
    <button
        :class="[baseClasses, sizeClass, colorClass, variantClass]"
        :style="buttonStyle"
        :disabled="props.disabled"
        @click="props.onClick"
    >
        <slot />
    </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePluginTheme } from './usePluginTheme'

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
    primary: 'bg-primary hover:bg-primary/75 active:bg-primary/75',
    green: 'bg-green-500 hover:bg-green-600 active:bg-green-700',
    red: 'bg-red-500 hover:bg-red-600 active:bg-red-700',
}

const ghostColorClasses = {
    primary: 'text-primary hover:bg-primary/10',
    green: 'text-green-500 hover:bg-green-500/10',
    red: 'text-red-500 hover:bg-red-500/10',
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

const isGhost = props.variant === 'ghost'
const colorClass = isGhost ? ghostColorClasses[props.color] : colorClasses[props.color]
const variantClass = variantClasses[props.variant]
const sizeClass = sizeClasses[props.size]

const { isDark } = usePluginTheme()

const buttonStyle = computed(() => {
    if (isGhost) return {}
    return { color: isDark() ? '#1f1f2f' : '#ffffff' }
})
</script>
