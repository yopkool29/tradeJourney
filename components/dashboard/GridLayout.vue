<template>
    <div class="relative">
        <grid-layout v-model:layout="localLayout" :col-num="colNum" :row-height="50" :is-draggable="isDraggable"
            :is-resizable="false" :vertical-compact="true" :use-css-transforms="true" :is-bounded="true"
            :responsive="false" :use-style-cursor="false"
            :class="{ 'layout-ready': layoutReady }" @layout-ready="onLayoutReady">
            <grid-item v-for="item in localLayout" :key="item.i" :x="item.x" :y="item.y" :w="item.w" :h="item.h"
                :i="item.i" class="rounded-lg overflow-hidden">
                <div class="h-full w-full relative" @mousedown="onMouseDown" @click.capture="onContentClick">
                    <UIcon v-if="isDraggable" name="i-lucide-grip"
                        class="absolute top-2 left-1 text-gray-800 dark:text-gray-200 opacity-50 pointer-events-none z-10"
                        size="xs" />
                    <component :is="components[item.i]" v-bind="{
                        ...(sharedProps || {}),
                        ...(componentProps?.[item.i] || {}),
                        layoutKey: layoutUpdateKey
                    }" />
                </div>
            </grid-item>
        </grid-layout>
    </div>
</template>

<script setup lang="ts">
import { GridLayout, GridItem } from 'vue-grid-layout-v3'

interface GridLayoutItem {
    x: number
    y: number
    w: number
    h: number
    i: string
}

const props = defineProps<{
    layout: GridLayoutItem[]
    components: Record<string, any>
    sharedProps?: Record<string, any>
    componentProps?: Record<string, Record<string, any>>
    isDraggable?: boolean
    colNum?: number
}>()

const localLayout = ref(props.layout.map(item => ({ ...item })))

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
        setTimeout(() => {
            layoutUpdateKey.value++
        }, 50)
    })
}

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
    transition: height 200ms ease;
}

:deep(.vue-grid-item) {
    transition: none;
}

:deep(.vue-grid-item.no-touch) {
    touch-action: none;
}

.layout-ready :deep(.vue-grid-item) {
    transition: all 200ms ease;
    transition-property: left, top;
}

:deep(.vue-grid-item.vue-grid-placeholder) {
    background: rgba(59, 130, 246, 0.1) !important;
    border: 2px dashed var(--color-primary-500, #3b82f6) !important;
    border-radius: 0.5rem;
    opacity: 0.5;
}

:deep(.vue-grid-item > .vue-resizable-handle) {
    display: none;
}

:deep(.vue-grid-item.vue-draggable-dragging) {
    cursor: grabbing !important;
}
</style>
