<template>
    <UModal v-model:open="open" :dismissible="true" :title="title">

        <slot name="trigger" />

        <template #body>
            <slot name="content" />
        </template>

        <template #footer>
            <slot name="footer" />
        </template>
    </UModal>
</template>

<script setup lang="ts">
defineProps({
    title: {
        type: String,
        default: '',
    },
})

const open = defineModel<boolean>('open')

const emit = defineEmits<{
    (e: 'opened' | 'closed'): void
}>()

watch(open, (newValue) => {
    if (newValue) {
        emit('opened')
    } else {
        emit('closed')
    }
})
</script>
