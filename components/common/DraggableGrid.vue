<template>
    <div ref="containerRef" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
            v-for="item in items"
            :key="item.id"
            :data-id="item.id"
            class="transition-all duration-200 cursor-move"
        >
            <component :is="item.component" v-bind="{ ...item.props, ...props.sharedProps }" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'

interface DraggableItem {
    id: string
    component: any
    props?: Record<string, any>
}

const props = defineProps<{
    items: DraggableItem[]
    sharedProps?: Record<string, any>
}>()

const emit = defineEmits<{
    'update:order': [order: string[]]
}>()

const containerRef = ref<HTMLElement>()
const localItems = ref([...props.items])

useSortable(containerRef, localItems)

watch(localItems, () => {
    const newOrder = localItems.value.map(item => item.id)
    emit('update:order', newOrder)
}, { deep: true })
</script>

<style scoped>
:deep(.sortable-ghost) {
    opacity: 0.5;
    outline: 2px dashed var(--color-primary-500, #3b82f6);
    outline-offset: -2px;
    border-radius: 0.5rem;
    background-image: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 10px,
        rgba(59, 130, 246, 0.05) 10px,
        rgba(59, 130, 246, 0.05) 20px
    );
}

:deep(.sortable-drag) {
    opacity: 0.9;
    transform: scale(1.02);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}
</style>
