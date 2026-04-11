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
                <div class="flex justify-end p-3 border-b border-gray-200 dark:border-gray-700">
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

    <TradeNotePickerModal
        v-model:open="showNotePicker"
        @associate="onNoteAssociated"
    />
</template>

<script setup lang="ts">
import type { NoteType } from '~/schema/note'

const open = defineModel<boolean>('open', { required: true })
const modelValue = defineModel<string>('modelValue', { required: true })
const emit = defineEmits<{ close: [] }>()

const { deleteNote } = useNotes()
const { trapRef, initFocusTrap, clearFocusTrap } = useFocusTrap()
const editorContainer = ref<HTMLElement | null>(null)
watch(editorContainer, (el) => { trapRef.value = el })

const localNote = ref(modelValue.value)
const showNotePicker = ref(false)

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
    localNote.value = note.content || ''
    if (mode === 'move' && note.id) {
        try {
            await deleteNote(note.id)
        } catch (error) {
            console.error('Failed to delete note after move:', error)
        }
    }
}

const onSave = () => {
    modelValue.value = localNote.value
    open.value = false
}

const onCancel = () => {
    open.value = false
}

const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open.value) {
        e.stopPropagation()
        onCancel()
    }
    if (e.key === 's' && (e.ctrlKey || e.metaKey) && open.value) {
        e.preventDefault()
        e.stopPropagation()
        onSave()
    }
}

onMounted(() => { document.addEventListener('keydown', onKeyDown, true) })
onUnmounted(() => { document.removeEventListener('keydown', onKeyDown, true) })
</script>
