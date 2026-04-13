<template>
    <div class="flex flex-col rounded-lg overflow-hidden relative" :class="{ 'border border-gray-200 dark:border-gray-700': !readonly, 'opacity-50': isFullscreen, 'h-full': fillHeight }">
        <!-- Delete icon in top-right corner for readonly mode -->
        <div v-if="readonly && props.showDeleteIcon" class="absolute top-2 right-2 z-10">
            <CommonModalDelete
                v-if="props.requireDeleteConfirmation"
                :from="'note-editor'"
                :title="$t('components.common.noteEditor.clear_note_title')"
                :confirm-text="$t('common.actions.confirm')"
                confirm-color="error"
                @confirm="emit('delete')">
                <template #trigger>
                    <UTooltip :text="$t('components.common.noteEditor.clear_note_tooltip')">
                        <UButton 
                            icon="i-heroicons-trash" 
                            size="xs" 
                            color="error" 
                            variant="ghost"
                            class="opacity-70 hover:opacity-100"
                            @click.stop />
                    </UTooltip>
                </template>
                <template #content>{{ $t('components.common.noteEditor.clear_note_confirm') }}</template>
            </CommonModalDelete>
            <UTooltip v-else :text="$t('components.common.noteEditor.clear_note_tooltip')">
                <UButton 
                    icon="i-heroicons-trash" 
                    size="xs" 
                    color="error" 
                    variant="ghost"
                    class="opacity-70 hover:opacity-100"
                    @click="emit('delete')"
                    @click.stop />
            </UTooltip>
        </div>
        
        <div v-if="!readonly" class="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ $t('components.trade.noteEditor.label') }}
            </span>
            <div class="flex gap-1">
                <UButton
                    v-if="!readonly"
                    icon="i-heroicons-trash"
                    color="error"
                    variant="ghost"
                    size="xs"
                    :title="$t('components.trade.noteEditor.clear')"
                    :disabled="!hasContent"
                    @click="emit('clear')"
                />
                <UButton
                    v-if="!props.hideFullscreen"
                    :icon="isFullscreen ? 'i-heroicons-arrows-pointing-in' : 'i-heroicons-arrows-pointing-out'"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :title="isFullscreen ? $t('components.trade.noteEditor.exit_fullscreen') : $t('components.trade.noteEditor.fullscreen')"
                    @click="toggleFullscreen"
                />
            </div>
        </div>
        <div
            ref="editorContainer"
            class="flex-1 milkdown-editor"
            :class="readonly ? 'overflow-hidden' : 'overflow-auto'"
            :style="editorStyle"
        >
            <div v-if="editorLoading" class="flex items-center justify-center h-full text-gray-400 text-sm">
                {{ $t('common.loading') }}
            </div>
        </div>
    </div>

    <!-- Fullscreen image modal -->
    <UModal
        v-model:open="fullscreenOpen"
        :close="false"
        :ui="{ overlay: 'z-[500]', content: 'z-[501] bg-black/90 shadow-none max-w-screen max-h-screen w-screen h-screen flex items-center justify-center rounded-none' }"
        @keydown.esc.stop="fullscreenOpen = false"
    >
        <template #content>
            <div class="note-image-fullscreen relative flex items-center justify-center w-full h-full" @click="fullscreenOpen = false">
                <button class="absolute top-4 right-4 text-white opacity-70 hover:opacity-100 cursor-pointer z-10 outline-none" @click.stop="fullscreenOpen = false">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <img :src="fullscreenImageUrl ?? ''" class="max-w-full max-h-full rounded-lg object-contain cursor-pointer" @click.stop="fullscreenOpen = false" />
            </div>
        </template>
    </UModal>

    <!-- Editor fullscreen overlay -->
    <!-- <Teleport to="body">
        <div
            v-if="isFullscreen"
            class="fixed inset-0 z-[200] bg-white dark:bg-gray-900 flex flex-col"
        >
            <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <span class="font-semibold text-gray-700 dark:text-gray-200">{{ $t('components.trade.noteEditor.label') }}</span>
                <UButton
                    icon="i-heroicons-arrows-pointing-in"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :title="$t('components.trade.noteEditor.exit_fullscreen')"
                    @click="toggleFullscreen"
                />
            </div>
            <div
                ref="fullscreenContainer"
                class="flex-1 overflow-auto milkdown-editor"
            />
        </div>
    </Teleport> -->
</template>

<script setup lang="ts">
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import { Crepe } from '@milkdown/crepe'

type UploadContext = {
    userId: number
    dbName: string
}

type Props = {
    modelValue: string
    readonly: boolean
    hideFullscreen?: boolean
    fillHeight?: boolean
    showDeleteIcon?: boolean
    requireDeleteConfirmation?: boolean
    uploadContext?: UploadContext
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'update:modelValue': [value: string]
    'clear': []
    'delete': []
}>()

const isFullscreen = ref(false)
const editorContainer = ref<HTMLElement | null>(null)
const fullscreenContainer = ref<HTMLElement | null>(null)
const editorLoading = ref(true)
const editor = ref<Crepe | null>(null)
const fullscreenImageUrl = ref<string | null>(null)
const fullscreenOpen = ref(false)
let imageObserver: MutationObserver | null = null

watch(fullscreenOpen, (open) => {
    if (!open) fullscreenImageUrl.value = null
})

const hasContent = computed(() => props.modelValue.trim().length > 0)

const editorStyle = computed(() => ({
    minHeight: props.fillHeight ? undefined : '160px',
    height: isFullscreen.value ? '0' : props.fillHeight ? '100%' : undefined,
    flex: props.fillHeight ? '1' : undefined,
}))

const uploadImage = async (file: File): Promise<string> => {
    if (!props.uploadContext) {
        // Fallback: convert to base64
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }
    const formData = new FormData()
    formData.append('image', file)
    const result = await $fetch<{ url: string }>('/api/notes/images/upload', {
        method: 'POST',
        body: formData,
    })
    return result.url
}

const injectFullscreenButton = (container: HTMLElement) => {
    const wrappers = container.querySelectorAll<HTMLElement>('.milkdown-image-block > .image-wrapper')
    wrappers.forEach((wrapper) => {
        if (wrapper.dataset.fsInjected) return
        wrapper.dataset.fsInjected = '1'
        const btn = document.createElement('div')
        btn.title = 'Fullscreen'
        btn.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,0.5);color:#fff;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;cursor:pointer;z-index:10;pointer-events:auto;'
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`
        wrapper.addEventListener('mouseenter', () => { btn.style.opacity = '1' })
        wrapper.addEventListener('mouseleave', () => { btn.style.opacity = '0' })
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault()
            e.stopPropagation()
            const img = wrapper.querySelector<HTMLImageElement>('img')
            if (img?.src) {
                fullscreenImageUrl.value = img.src
                fullscreenOpen.value = true
            }
        })
        wrapper.appendChild(btn)
    })
}

const startImageObserver = (container: HTMLElement) => {
    imageObserver?.disconnect()
    injectFullscreenButton(container)
    imageObserver = new MutationObserver(() => injectFullscreenButton(container))
    imageObserver.observe(container, { childList: true, subtree: true })
}

const createEditor = async (container: HTMLElement, content: string, editable: boolean) => {
    const instance = new Crepe({
        root: container,
        defaultValue: content || '',
        features: {
            [Crepe.Feature.TopBar]: editable,
        },
        featureConfigs: {
            [Crepe.Feature.ImageBlock]: {
                onUpload: uploadImage,
                inlineOnUpload: uploadImage,
                blockOnUpload: uploadImage,
            },
        },
    })
    if (!editable) {
        instance.setReadonly(true)
    }
    await instance.create()
    if (editable) {
        instance.on((api) => {
            api.markdownUpdated((_ctx, markdown) => {
                internalUpdate = true
                emit('update:modelValue', markdown)
                nextTick(() => { internalUpdate = false })
            })
        })
    }
    startImageObserver(container)
    return instance
}

const initEditor = async () => {
    if (!editorContainer.value) return
    editorLoading.value = true
    try {
        editor.value = await createEditor(editorContainer.value, props.modelValue, !props.readonly)
    } finally {
        editorLoading.value = false
    }
}

const toggleFullscreen = async () => {
    isFullscreen.value = !isFullscreen.value
    if (isFullscreen.value) {
        await nextTick()
        if (fullscreenContainer.value) {
            await createEditor(fullscreenContainer.value, props.modelValue, false)
        }
    }
}

watch(editorContainer, (el) => {
    if (el) nextTick(initEditor)
}, { immediate: true })

let internalUpdate = false
watch(() => props.modelValue, async (newVal) => {
    if (internalUpdate) return
    if (!editor.value || !editorContainer.value) return
    try {
        internalUpdate = true
        await editor.value.destroy()
        editor.value = await createEditor(editorContainer.value, newVal, !props.readonly)
    } finally {
        internalUpdate = false
    }
}, { flush: 'post' })

onBeforeUnmount(() => {
    imageObserver?.disconnect()
    editor.value?.destroy()
})

// Exposed for imperative usage (e.g. NotesPanel)
const getContent = () => props.modelValue
const setContent = async (newVal: string) => {
    emit('update:modelValue', newVal)
}

defineExpose({ getContent, setContent })
</script>
