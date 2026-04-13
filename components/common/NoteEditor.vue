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

    <!-- Fullscreen overlay -->
    <Teleport to="body">
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
    </Teleport>
</template>

<script setup lang="ts">
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import { Crepe } from '@milkdown/crepe'

type Props = {
    modelValue: string
    readonly: boolean
    hideFullscreen?: boolean
    fillHeight?: boolean
    showDeleteIcon?: boolean
    requireDeleteConfirmation?: boolean
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

const hasContent = computed(() => props.modelValue.trim().length > 0)

const editorStyle = computed(() => ({
    minHeight: props.fillHeight ? undefined : '160px',
    height: isFullscreen.value ? '0' : props.fillHeight ? '100%' : undefined,
    flex: props.fillHeight ? '1' : undefined,
}))

const convertBlobsToBase64 = async (markdown: string): Promise<string> => {
    const blobRegex = /!\[([^\]]*)\]\((blob:[^)]+)\)/g
    const matches = [...markdown.matchAll(blobRegex)]
    if (matches.length === 0) return markdown
    let result = markdown
    for (const match of matches) {
        const [full, alt, blobUrl] = match
        try {
            const response = await fetch(blobUrl)
            const blob = await response.blob()
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
            })
            result = result.replace(full, `![${alt}](${base64})`)
        } catch {
            // blob URL expired or invalid - leave as-is
        }
    }
    return result
}

const createEditor = async (container: HTMLElement, content: string, editable: boolean) => {
    const instance = new Crepe({
        root: container,
        defaultValue: content || '',
        features: {
            [Crepe.Feature.TopBar]: editable,
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
                convertBlobsToBase64(markdown).then((converted) => {
                    emit('update:modelValue', converted)
                    nextTick(() => { internalUpdate = false })
                })
            })
        })
    }
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
    editor.value?.destroy()
})

// Exposed for imperative usage (e.g. NotesPanel)
const getContent = () => props.modelValue
const setContent = async (newVal: string) => {
    emit('update:modelValue', newVal)
}

defineExpose({ getContent, setContent })
</script>
