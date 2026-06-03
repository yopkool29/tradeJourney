<template>
    <div ref="containerRef" :class="gridClass || 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 grid-flow-dense auto-rows-fr'">
        <div
            v-for="item in localItems"
            :key="item.id"
            :data-id="item.id"
            :data-size="item.class?.includes('col-span-2') ? 'large' : 'small'"
            :class="['transition-all duration-200 cursor-move', item.class]"
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
    class?: string
}

const props = defineProps<{
    items: DraggableItem[]
    sharedProps?: Record<string, any>
    gridClass?: string
}>()

const emit = defineEmits<{
    'update:order': [order: string[]]
}>()

const containerRef = ref<HTMLElement>()
const localItems = shallowRef([...props.items])

// @ts-expect-error useSortable types don't expose onMove callback
useSortable(containerRef, localItems, {
    animation: 150,
    forceFallback: true,
    fallbackClass: 'sortable-fallback',
    swap: true,
    swapClass: 'sortable-swap',
    onMove: (evt: any) => {
        const draggedSize = evt.dragged.getAttribute('data-size')
        const relatedSize = evt.related.getAttribute('data-size')
        if (draggedSize === 'large' && relatedSize === 'small') {
            return false
        }
    }
})

watch(() => props.items, (newItems) => {
    const newIds = newItems.map(i => i.id).join(',')
    const localIds = localItems.value.map(i => i.id).join(',')
    if (newIds !== localIds) {
        localItems.value = [...newItems]
    }
})

watch(localItems, () => {
    const newOrder = localItems.value.map(item => item.id)
    emit('update:order', newOrder)
})
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

:deep(.sortable-fallback) {
    opacity: 0.9;
    transform: scale(1.02);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    pointer-events: none;
}

:deep(.sortable-drag) {
    opacity: 0.9;
    transform: scale(1.02);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}
</style>
