<template>
    <UModal v-model:open="open" :dismissible="dismissible" :description="modalDescription" :class="class"
        :ui="{ ...ui, description: hideDescription ? 'sr-only' : undefined }">
        <template #title>
            <span v-if="!title" class="sr-only">{{ $t('common.modal.default_title', 'Dialog') }}</span>
            <template v-else>{{ title }}</template>
        </template>

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
const props = defineProps({
    title: {
        type: String,
        default: '',
    },
    description: {
        type: String,
        default: '',
    },
    hideDescription: {
        type: Boolean,
        default: true,
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

const modalDescription = computed(() => (props.description ? props.description : props.title))

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
