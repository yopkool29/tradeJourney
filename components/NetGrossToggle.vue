<template>
    <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ $t('components.dashboard.net_gross_toggle.label') }}</span>
        <UButtonGroup size="sm" orientation="horizontal">
            <UButton
                :color="modelValue ? 'primary' : 'neutral'"
                :variant="modelValue ? 'solid' : 'outline'"
                @click="$emit('update:modelValue', true)"
            >
                {{ $t('components.dashboard.net_gross_toggle.net') }}
            </UButton>
            <UButton
                :color="!modelValue ? 'primary' : 'neutral'"
                :variant="!modelValue ? 'solid' : 'outline'"
                @click="$emit('update:modelValue', false)"
            >
                {{ $t('components.dashboard.net_gross_toggle.gross') }}
            </UButton>
        </UButtonGroup>
    </div>
</template>

<script setup lang="ts">
interface Props {
    modelValue: boolean
}

defineProps<Props>()

defineEmits<{
    'update:modelValue': [value: boolean]
}>()
</script>
