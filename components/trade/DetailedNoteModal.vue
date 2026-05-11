<template>
    <CommonModalDefault
        v-model:open="open"
        :dismissible="false"
        :title="$t('components.trade.noteEditor.label')"
        :ui="{ body: 'flex-1 min-h-0 p-0 sm:p-0', overlay: 'z-[200]', content: 'z-[201] focus:outline-none flex flex-col h-screen max-w-4/5' }"
        @closed="emit('close')"
    >
        <template #content>
            <div class="flex flex-col h-full">
                <div class="flex justify-start p-3 border-b border-gray-200 dark:border-gray-700">
                    <UButton
                        :label="$t('components.trade.formModal.detailedNote.from_notes')"
                        icon="i-heroicons-link"
                        color="neutral"
                        variant="outline"
                        size="sm"
                        @click="showNotePicker = true"
                    />
                </div>
                <div ref="editorContainer" class="flex-1 overflow-auto">
                    <CommonNoteEditor
                        v-model="localNote"
                        :readonly="false"
                        :hide-fullscreen="true"
                        :fill-height="true"
                        :upload-context="uploadContext"
                        @clear="localNote = ''"
                    />
                </div>
            </div>
        </template>
        <template #footer>
            <div class="action-buttons-end">
                <UButton @click="onSave">{{ $t('common.actions.save') }}</UButton>
                <UButton variant="soft" @click="onCancel">{{ $t('common.actions.cancel') }}</UButton>
            </div>
        </template>
    </CommonModalDefault>

    <TradeNotePickerModal v-model:open="showNotePicker" @associate="onNoteAssociated" />
</template>

<script setup lang="ts">
import type { NoteType } from '~/schema/note'

const open = defineModel<boolean>('open', { required: true })
const modelValue = defineModel<string>('modelValue', { required: true })
const emit = defineEmits<{ close: [] }>()

type Props = { tradeId?: number }
const props = defineProps<Props>()

const { deleteNote } = useNotes()
const { uploadContext, cleanupOrphanImages, cleanupTmpImages, finalizeImages, duplicateImages } = useNoteImages()
const { trapRef, initFocusTrap, clearFocusTrap } = useFocusTrap()
const editorContainer = ref<HTMLElement | null>(null)
watch(editorContainer, (el) => {
    trapRef.value = el
})

const localNote = ref(modelValue.value)
const showNotePicker = ref(false)
const pendingNoteMove = ref<{ noteId: number } | null>(null)

watch(modelValue, (val) => {
    localNote.value = val
})

watch(open, async (val) => {
    if (val) {
        localNote.value = modelValue.value
        await nextTick()
        // Wait for ProseMirror to be mounted
        setTimeout(initFocusTrap, 100)
    } else {
        clearFocusTrap()
    }
})

const onNoteAssociated = async (note: NoteType, mode: 'copy' | 'move') => {
    let content = note.content || ''

    // When copying, duplicate the images so they are independent
    if (mode === 'copy') {
        content = await duplicateImages(content)
    }

    localNote.value = content

    if (mode === 'move' && note.id) {
        // Store the pending move instead of executing it immediately
        pendingNoteMove.value = { noteId: note.id }
    } else {
        // Clear any pending move if mode is copy
        pendingNoteMove.value = null
    }
}

const onSave = async () => {
    const originalContent = modelValue.value
    const finalContent = props.tradeId ? await finalizeImages(props.tradeId, localNote.value) : localNote.value
    console.log('originalContent', originalContent)
    console.log('finalContent', finalContent)
    await cleanupOrphanImages(originalContent, finalContent)
    modelValue.value = finalContent

    // Execute pending note move if any
    if (pendingNoteMove.value) {
        try {
            await deleteNote(pendingNoteMove.value.noteId)
        } catch (error) {
            console.error('Failed to delete note after move:', error)
        }
        pendingNoteMove.value = null
    }

    open.value = false
}

const onCancel = () => {
    // Clear any pending move when cancelling
    pendingNoteMove.value = null
    if (localNote.value.includes('tmp_nt_')) cleanupTmpImages()
    open.value = false
}

const { isTop, push, pop } = useModalStack('detailedNote')

watch(open, (val) => {
    if (val) push()
    else pop()
})

const onKeyDown = (e: KeyboardEvent) => {
    if (!open.value || !isTop.value) return
    if (e.key === 'Escape') {
        if (document.querySelector('.note-image-fullscreen')) return
        e.preventDefault()
        e.stopPropagation()
        onCancel()
    }
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        e.stopPropagation()
        onSave()
    }
}

onMounted(() => {
    document.addEventListener('keydown', onKeyDown, true)
})
onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown, true)
})
</script>
