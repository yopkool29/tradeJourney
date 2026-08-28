<template>
    <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 -translate-x-full"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition ease-in duration-300"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-full"
    >
        <div v-if="isOpen" class="fixed left-0 top-0 h-full bg-default shadow-lg z-50 flex" style="width: 900px; max-width: 90vw">
            <!-- Liste des dates avec des notes -->
            <div class="w-48 border-r border-default bg-default overflow-y-auto">
                <div class="p-3 border-b border-default">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-sm font-semibold text-muted">{{ $t('components.notes_panel.sidebar.title') }}</h3>
                        <UButton
                            icon="i-heroicons-plus"
                            :label="$t('components.notes_panel.sidebar.add_note')"
                            color="primary"
                            variant="ghost"
                            size="xs"
                            @click="openCreateModal"
                        />
                    </div>
                    <div class="space-y-1">
                        <div v-for="dateGroup in noteDatesGrouped" :key="dateGroup.date" class="mb-2">
                            <!-- Date du jour -->
                            <div class="px-2 py-1 text-xs font-semibold text-muted uppercase tracking-wider">
                                {{ formatDateLongString(dateGroup.date, locale) }}
                            </div>
                            <!-- Notes pour cette date -->
                            <div
                                v-for="note in dateGroup.notes"
                                :key="note.id"
                                class="px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors flex justify-between items-center select-none ml-2"
                                :class="{
                                    'bg-primary/10 text-primary': selectedNoteId === note.id,
                                    'text-default hover:bg-elevated': selectedNoteId !== note.id,
                                }"
                                @click="selectNote(note)"
                            >
                                <div class="flex items-center gap-1.5 flex-1 min-w-0">
                                    <div v-if="selectedNoteId === note.id" class="w-2 h-2 bg-red-500 rounded-full shrink-0"></div>
                                    <div class="truncate">{{ formatNoteTime(note.date) }}</div>
                                </div>
                                <UButton
                                    icon="i-heroicons-trash"
                                    color="error"
                                    variant="ghost"
                                    size="xs"
                                    :title="$t('components.notes_panel.sidebar.delete_note')"
                                    @click.stop="confirmDeleteNote(note)"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Éditeur principal -->
            <div class="flex-1 flex flex-col h-full">
                <!-- En-tête -->
                <div class="p-4 border-b border-default flex justify-between items-center">
                    <div class="flex-1">
                        <div class="flex items-center gap-3">
                            <h2 class="text-lg font-semibold whitespace-nowrap">
                                {{ showDirtyIndicator ? '* ' : '' }}{{ $t('components.notes_panel.header.notes_of', { date: formattedDate }) }}
                            </h2>
                            <UButton
                                v-if="selectedNote"
                                icon="i-heroicons-calendar"
                                size="xs"
                                color="neutral"
                                variant="ghost"
                                :title="$t('components.notes_panel.header.change_date_time')"
                                @click="openChangeDateTimeModal"
                            />
                            <input
                                v-if="selectedNote"
                                v-model="noteSubtitle"
                                type="text"
                                :placeholder="$t('components.notes_panel.header.subtitle_placeholder')"
                                class="flex-1 text-sm bg-transparent border-b border-transparent hover:border-muted focus:border-primary focus:outline-none text-muted placeholder-muted transition-colors"
                                spellcheck="false"
                            />
                        </div>
                        <div v-if="selectedNote" class="text-sm text-muted">
                            {{ formatNoteTime(selectedNote.date) }}
                        </div>
                    </div>
                    <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="sm" @click="closePanel" />
                </div>

                <!-- Éditeur Markdown -->
                <div class="flex-1 overflow-hidden flex flex-col w-full">
                    <div v-if="!selectedNote" class="flex-1 flex items-center justify-center text-muted text-sm">
                        {{ $t('components.notes_panel.editor.no_note_selected') }}
                    </div>
                    <CommonNoteEditor
                        v-else
                        ref="noteEditor"
                        :model-value="editorContent"
                        :readonly="false"
                        :hide-fullscreen="true"
                        :fill-height="true"
                        :upload-context="uploadContext"
                        @update:model-value="editorContent = $event"
                        @clear="editorContent = ''"
                    />
                </div>

                <!-- Pied de page -->
                <div v-if="selectedNote" class="p-3 border-t border-default flex justify-center">
                    <div class="flex gap-2">
                        <UButton :label="$t('common.actions.save')" color="primary" :loading="loading" :disabled="loading" @click="doSaveNote" />
                        <UButton
                            :label="$t('common.actions.save_and_close')"
                            color="primary"
                            variant="soft"
                            :loading="loading"
                            :disabled="loading"
                            @click="saveAndClose"
                        />
                        <UButton :label="$t('common.actions.close')" color="neutral" variant="ghost" :disabled="loading" @click="closePanel" />
                    </div>
                </div>
            </div>
        </div>
    </Transition>

    <!-- Modal modifications non sauvegardées -->
    <CommonModalDefault v-model:open="showUnsavedModal" :title="$t('components.notes_panel.unsaved_modal.title')">
        <template #content>
            <UForm id="unsavedModalForm" :state="{}" @submit="doOnUnsavedSaveAndContinue">
                <p>{{ $t('components.notes_panel.unsaved_modal.content') }}</p>
            </UForm>
        </template>
        <template #footer>
            <div class="action-buttons-end">
                <UButton type="submit" form="unsavedModalForm" :label="$t('common.actions.save')" color="primary" :loading="loading" />
                <UButton
                    :label="$t('common.actions.cancel')"
                    color="neutral"
                    variant="ghost"
                    @click="onUnsavedDiscard"
                />
            </div>
        </template>
    </CommonModalDefault>

    <!-- Modal de création d'une nouvelle note -->
    <CommonModalDefault v-model:open="showCreateModal" :title="$t('components.notes_panel.create_modal.title')">
        <template #content>
            <UForm id="createNoteForm" :state="{}" @submit="confirmCreateNote">
                <div class="space-y-4">
                    <UFormField :label="$t('components.notes_panel.create_modal.date_label')">
                        <UInput v-model="createNoteDate" type="date" class="w-full" autofocus />
                    </UFormField>
                    <UFormField :label="$t('components.notes_panel.create_modal.time_label')">
                        <UInput v-model="createNoteTime" type="time" class="w-full" />
                    </UFormField>
                    <UFormField :label="$t('components.notes_panel.create_modal.subtitle_label')">
                        <UInput v-model="createNoteSubtitle" :placeholder="$t('components.notes_panel.header.subtitle_placeholder')" class="w-full" @keydown.enter="confirmCreateNote" />
                    </UFormField>
                </div>
            </UForm>
        </template>
        <template #footer>
            <div class="action-buttons-end">
                <UButton :label="$t('common.actions.cancel')" color="neutral" variant="ghost" @click="showCreateModal = false" />
                <UButton type="submit" form="createNoteForm" :label="$t('common.actions.create')" color="primary" />
            </div>
        </template>
    </CommonModalDefault>

    <!-- Modal de modification de date et heure -->
    <CommonModalDefault v-model:open="showChangeDateTimeModal" :title="$t('components.notes_panel.change_datetime_modal.title')">
        <template #content>
            <UForm id="changeDateTimeForm" :state="{}" @submit="confirmChangeDateTime">
                <div class="space-y-4">
                    <UFormField :label="$t('components.notes_panel.create_modal.date_label')">
                        <UInput v-model="changeNoteDate" type="date" class="w-full" autofocus />
                    </UFormField>
                    <UFormField :label="$t('components.notes_panel.create_modal.time_label')">
                        <UInput v-model="changeNoteTime" type="time" class="w-full" @keydown.enter="confirmChangeDateTime" />
                    </UFormField>
                </div>
            </UForm>
        </template>
        <template #footer>
            <div class="action-buttons-end">
                <UButton :label="$t('common.actions.cancel')" color="neutral" variant="ghost" @click="showChangeDateTimeModal = false" />
                <UButton type="submit" form="changeDateTimeForm" :label="$t('common.actions.update')" color="primary" />
            </div>
        </template>
    </CommonModalDefault>

    <!-- Modal de confirmation de suppression -->
    <CommonModalDelete v-model:open="showDeleteModal" :title="$t('components.notes_panel.delete_modal.title')" @confirm="deleteNoteConfirmed">
        <template #content>
            <p class="mb-4">
                {{
                    $t('components.notes_panel.delete_modal.content', {
                        date: noteToDelete?.date ? formatDateLongString(noteToDelete.date, locale) : '',
                    })
                }}
            </p>
        </template>
    </CommonModalDelete>
</template>

<script setup lang="ts">
import { formatDateLongString } from '~/utils/date-utils'

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true,
    },
    selectedDate: {
        type: Date,
        required: true,
    },
})
const emit = defineEmits(['close', 'save', 'update:selectedDate'])
const { locale } = useI18n()

const {
    loading, selectedNote, showDeleteModal, noteToDelete,
    showUnsavedModal, pendingAction,
    showCreateModal, createNoteDate, createNoteTime, createNoteSubtitle,
    showChangeDateTimeModal, changeNoteDate, changeNoteTime,
    editorContent, noteSubtitle,
    uploadContext,
    isDirty, showDirtyIndicator, selectedNoteId, noteDatesGrouped,
    selectNote, openCreateModal, openChangeDateTimeModal,
    confirmChangeDateTime, confirmCreateNote, createNewNote,
    loadNotes, saveNote, onUnsavedDiscard, onUnsavedSaveAndContinue,
    confirmDeleteNote, deleteNoteConfirmed, cleanupTmpImages,
} = useNotesPanel()

const noteEditor = ref<{ getContent: () => string; setContent: (v: string) => Promise<void> } | null>(null)

const formattedDate = computed(() => {
    const date = selectedNote.value ? new Date(selectedNote.value.date) : props.selectedDate
    return formatDateLongString(date, locale.value)
})

const formatNoteTime = (date: string | Date) => {
    const d = new Date(date)
    return d.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
}

const doSaveNote = () => saveNote(emit as (event: string, data: unknown) => void)
const doOnUnsavedSaveAndContinue = () => onUnsavedSaveAndContinue(emit as (event: string, data: unknown) => void)
const saveAndClose = async () => {
    await doSaveNote()
    emit('close')
}

const closePanel = () => {
    if (isDirty.value) {
        pendingAction.value = () => emit('close')
        showUnsavedModal.value = true
        return
    }
    emit('close')
}

watch(selectedNote, (note) => {
    if (!note) {
        editorContent.value = ''
        noteSubtitle.value = ''
    }
})

watch(
    () => props.isOpen,
    async (isOpen: boolean) => {
        if (isOpen) {
            selectedNote.value = null
            await loadNotes()
        } else {
            cleanupTmpImages()
        }
    },
    { immediate: true }
)

const handleKeyDown = async (e: KeyboardEvent) => {
    if (!e.key) return
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (props.isOpen) {
            e.preventDefault()
            await doSaveNote()
        }
    } else if (e.key.toLowerCase() === 'escape') {
        if (props.isOpen) {
            e.preventDefault()
            closePanel()
        }
    }
}

onMounted(() => window.addEventListener('keydown', handleKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeyDown))

defineExpose({
    saveNote: doSaveNote,
    createNewNote,
    selectNote,
})
</script>
