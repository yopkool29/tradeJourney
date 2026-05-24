<template>
    <div ref="containerRef" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
            v-for="item in items"
            :key="item.id"
            :data-id="item.id"
            class="transition-all duration-200 cursor-move"
        >
            <component :is="item.component" v-bind="item.props" />
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
