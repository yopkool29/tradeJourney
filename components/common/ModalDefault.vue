<template>
    <UModal v-model:open="open" :dismissible="dismissible" :title="title" :class="class" :ui="ui">

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
    class: {
        type: String,
        default: '',
    },
    ui: {
        type: Object,
        default: () => ({})
    },
    dismissible: {
        type: Boolean,
        default: true,
    }
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
