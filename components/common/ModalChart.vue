<template>
    <UModal
        v-model:open="modelValue"
        :dismissible="true"
        :title="title"
        class="sm:max-w-6xl h-[300px] sm:h-[500px]"
        :ui="{ content: 'md:max-w-4/5' }"
    >
        <template #body>
            <div class="h-full w-full" @click="modelValue = false">
                <slot name="content" />
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
const modelValue = defineModel<boolean>('modelValue', { required: true })

defineProps<{
    title?: string
}>()
</script>
