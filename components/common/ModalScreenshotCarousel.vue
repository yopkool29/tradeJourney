<template>
    <UModal v-model:open="open" :ui="{ content: 'md:max-w-full' }">
        <template #body>
            <UCarousel
                v-slot="{ item, index }"
                auto-height
                arrows
                :items="screenshots"
                :ui="{ item: 'flex items-center justify-center' }"
                class="rounded-lg"
            >
                <img :src="getImagePath(item.url)" :alt="`Capture d'écran ${index + 1}`" class="rounded-lg" />
            </UCarousel>
        </template>
    </UModal>
</template>

<script setup lang="ts">
import { getImagePath } from '~/utils'

defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    screenshots: {
        type: Array as PropType<Array<{ id?: number; url: string }>>,
        default: () => [],
    },
})

const open = defineModel<boolean>('open')

const emit = defineEmits<{
    (e: 'opened' | 'closed'): void
}>()

watch(open, async (newValue) => {
    if (newValue) {
        emit('opened')
    } else {
        emit('closed')
    }
})
</script>
