<template>
    <div class="relative">
        <grid-layout :key="gridKey" v-model:layout="localLayout" :col-num="colNum" :row-height="50" :is-draggable="isDraggable"
            :is-resizable="isResizable" :vertical-compact="true" :use-css-transforms="true" :is-bounded="true"
            :responsive="false" :use-style-cursor="false"
            :class="{ 'layout-ready': layoutReady, 'select-none': isDraggable, 'drag-mode': isDraggable }"
            @layout-ready="onLayoutReady">
            <grid-item v-for="item in localLayout" :key="item.i" :x="item.x" :y="item.y" :w="item.w" :h="item.h"
                :i="item.i" :is-resizable="isItemResizable(item.i)" class="rounded-lg overflow-hidden">
                <div class="h-full w-full relative group" @mousedown="onMouseDown" @click.capture="onContentClick">
                    <UIcon v-if="isDraggable" name="i-lucide-grip"
                        class="absolute top-2 left-1 text-gray-800 dark:text-gray-200 opacity-50 z-10"
                        size="xs" />
                    <!-- Bouton close (X) pour tous les items -->
                    <button
                        v-if="removableItems?.includes(item.i)"
                        class="absolute top-1 right-2 z-30 px-1.5 py-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 opacity-70 group-hover:opacity-100"
                        :title="$t('common.actions.close')"
                        @click.stop="$emit('remove-item', item.i)"
                    >
                        <UIcon name="i-lucide-x" class="w-5 h-5 text-gray-800 dark:text-gray-200" />
                    </button>
                    <component :is="components[item.i]" class="h-full" v-bind="{
                        ...(sharedProps || {}),
                        ...(componentProps?.[item.i] || {})
                    }" />
                </div>
            </grid-item>
        </grid-layout>
    </div>
</template>

<script setup lang="ts">
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
import type { Component } from 'vue'

interface GridLayoutItem {
    x: number
    y: number
    w: number
    h: number
    i: string
}

const props = defineProps<{
    layout: GridLayoutItem[]
    components: Record<string, Component>
    sharedProps?: Record<string, unknown>
    componentProps?: Record<string, Record<string, unknown>>
    isDraggable?: boolean
    isResizable?: boolean
    resizableItems?: string[]
    // Items qui peuvent être supprimés via le bouton X
    removableItems?: string[]
    colNum?: number
}>()

defineEmits<{
    'remove-item': [itemId: string]
}>()

const localLayout = ref(props.layout.map(item => ({ ...item })))

const isItemResizable = (itemId: string): boolean => {
    if (!props.isResizable) 
        return false
    if (props.resizableItems && props.resizableItems.length > 0) {
        return props.resizableItems.includes(itemId)
    }
    return true
}

const layoutsEqual = (a: GridLayoutItem[], b: GridLayoutItem[]) => {
    if (a.length !== b.length) return false
    return a.every((item, i) => {
        const other = b[i]
        return item.i === other.i && item.x === other.x && item.y === other.y && item.w === other.w && item.h === other.h
    })
}

watch(() => props.layout, (newLayout) => {
    if (!layoutsEqual(localLayout.value, newLayout)) {
        localLayout.value = newLayout.map(item => ({ ...item }))
    }
}, { immediate: true })

// Prevent initial flash: disable CSS transitions until the layout has calculated positions once
const layoutReady = ref(false)
const layoutUpdateKey = ref(0)

const onLayoutReady = () => {
    layoutReady.value = true
    nextTick(() => {
        layoutUpdateKey.value++
    })
}

const gridKey = ref(0)

onActivated(() => {
    gridKey.value++
    layoutReady.value = false
    // Le layout-ready event mettra layoutReady a true quand le grid est calcule
})

watch(() => props.colNum, () => {
    localLayout.value = props.layout.map(item => ({ ...item }))
})

const colNum = computed(() => props.colNum || 12)

defineExpose({ getLayout: () => localLayout.value.map(item => ({ ...item })) })

// Prevent click events on child components after a drag + disable text selection during drag
const mouseStart = ref<{ x: number; y: number } | null>(null)
const isRealClick = ref(true)
const isDragging = ref(false)

const onDocumentMouseMove = (e: MouseEvent) => {
    if (!mouseStart.value) return
    const dx = Math.abs(e.clientX - mouseStart.value.x)
    const dy = Math.abs(e.clientY - mouseStart.value.y)
    if (dx > 5 || dy > 5) {
        isRealClick.value = false
        if (!isDragging.value) {
            isDragging.value = true
            document.body.style.userSelect = 'none'
        }
    }
}

const onDocumentMouseUp = () => {
    document.removeEventListener('mousemove', onDocumentMouseMove)
    document.removeEventListener('mouseup', onDocumentMouseUp)
    mouseStart.value = null
    if (isDragging.value) {
        isDragging.value = false
        document.body.style.userSelect = ''
    }
}

const onMouseDown = (e: MouseEvent) => {
    if (!props.isDraggable) return
    mouseStart.value = { x: e.clientX, y: e.clientY }
    isRealClick.value = true
    document.addEventListener('mousemove', onDocumentMouseMove)
    document.addEventListener('mouseup', onDocumentMouseUp)
}

const onContentClick = (e: MouseEvent) => {
    if (!props.isDraggable) return
    if (!isRealClick.value) {
        e.stopPropagation()
        e.preventDefault()
        isRealClick.value = true
    }
}

</script>

<style scoped>
:deep(.vue-grid-layout) {
    position: relative;
}

:deep(.vue-grid-item) {
    transition: none;
}

:deep(.vue-grid-item.no-touch) {
    touch-action: none;
}

.layout-ready :deep(.vue-grid-item) {
    transition: all 100ms ease;
    transition-property: left, top;
}

:deep(.vue-grid-item.vue-grid-placeholder) {
    background: rgba(59, 130, 246, 0.1) !important;
    border: 2px dashed var(--color-primary-500, #3b82f6) !important;
    border-radius: 0.5rem;
    opacity: 0.5;
}

:deep(.vue-grid-item.vue-draggable-dragging) {
    cursor: grabbing !important;
}

/* Curseur pointer sur les grid-items quand le mode drag est activé */
:deep(.drag-mode) .vue-grid-item {
    cursor: pointer;
}

/* Resize handles - more visible */
:deep(.vue-resizable-handle) {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: 4px;
    right: 4px;
    cursor: se-resize;
    z-index: 100;
    background: linear-gradient(135deg, transparent 40%, rgba(100, 116, 139, 0.9) 40%);
    border-radius: 0 0 6px 0;
    border: 2px solid rgba(255, 255, 255, 0.8);
    box-shadow: -2px -2px 4px rgba(0, 0, 0, 0.2);
}

:deep(.vue-resizable-handle:hover) {
    background: linear-gradient(135deg, transparent 40%, var(--color-primary-300) 40%);
    border-color: var(--color-primary-300);
    box-shadow: -2px -2px 6px rgba(0, 0, 0, 0.3);
}
</style>
