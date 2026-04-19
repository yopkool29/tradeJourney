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
                'border border-gray-300 dark:border-gray-600',
                sizeClass,
                colorClass,
                variantClass,
                props.disabled ? 'opacity-75 cursor-not-allowed' : ''
            ]"
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
        :class="[baseClasses, sizeClass, colorClass, variantClass]"
        :disabled="props.disabled"
        @change="props.onChange"
    />
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        id?: string
        type?: string
        color?: 'primary' | 'green' | 'red'
        variant?: 'solid' | 'ghost'
        size?: 'sm' | 'md' | 'lg'
        disabled?: boolean
        onChange?: (event: Event) => void
    }>(),
    {
        id: undefined,
        type: 'text',
        color: 'primary',
        variant: 'solid',
        size: 'md',
        disabled: false,
        onChange: undefined,
    }
)

const colorClasses = {
    primary: 'bg-primary text-white hover:bg-primary/75 active:bg-primary/75',
    green: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700',
    red: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
}

const variantClasses = {
    solid: '',
    ghost: 'file:bg-transparent file:hover:bg-gray-100 dark:file:hover:bg-gray-800',
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
