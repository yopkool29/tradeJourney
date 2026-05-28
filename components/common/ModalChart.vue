<template>
    <UModal
        v-model:open="modelValue"
        :dismissible="true"
        :description="title"
        class="sm:max-w-6xl h-[300px] sm:h-[500px]"
        :ui="{ content: 'md:max-w-4/5', description: props.hideDescription ? 'sr-only' : undefined }"
    >
        <template #title>
            <span v-if="!title" class="sr-only">{{ $t('common.modal.chart_title', 'Chart') }}</span>
            <template v-else>{{ title }}</template>
        </template>
        <template #body>
            <div class="h-full w-full" @click="modelValue = false">
                <slot name="content" />
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
const modelValue = defineModel<boolean>('modelValue', { required: true })

const props = defineProps({
    title: {
        type: String,
        default: ''
    },
    hideDescription: {
        type: Boolean,
        default: true
    }
})
</script>
