<template>
    <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 -translate-x-full"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition ease-in duration-300"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-full"
    >
        <div v-if="isOpen" class="fixed left-0 top-0 h-full bg-white dark:bg-gray-800 shadow-lg z-50 flex" style="width: 900px; max-width: 90vw">
            <!-- Liste des dates avec des notes -->
            <div class="w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
                <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300">{{ $t('components.notes_panel.sidebar.title') }}</h3>
                        <UButton
                            icon="i-heroicons-plus"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            :title="$t('components.notes_panel.sidebar.add_note')"
                            @click="createNewNote(formatDateToYYYYMMDD(selectedDate))"
                        />
                    </div>
                    <div class="space-y-1">
                        <div
                            v-for="dateGroup in noteDatesGrouped"
                            :key="dateGroup.date"
                            class="mb-2"
                        >
                            <!-- Date du jour -->
                            <div
                                class="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                            >
                                {{ formatDateLongString(dateGroup.date, locale) }}
                            </div>
                            <!-- Notes pour cette date -->
                            <div
                                v-for="note in dateGroup.notes"
                                :key="note.id"
                                class="px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors flex justify-between items-center select-none ml-2"
                                :class="{
                                    'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-200': selectedNoteId === note.id,
                                    'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800': selectedNoteId !== note.id,
                                }"
                                @click="selectNote(note)"
                            >
                                <div class="flex-1 min-w-0">
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
                            <!-- Bouton pour ajouter une nouvelle note -->
                            <div class="ml-2">
                                <UButton
                                    icon="i-heroicons-plus"
                                    color="neutral"
                                    variant="ghost"
                                    size="xs"
                                    :title="$t('components.notes_panel.sidebar.add_note')"
                                    @click="createNewNote(dateGroup.date)"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Éditeur principal -->
            <div class="flex-1 flex flex-col h-full">
                <!-- En-tête -->
                <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div class="flex-1">
                        <div class="flex items-center gap-3">
                            <h2 class="text-lg font-semibold whitespace-nowrap">{{ $t('components.notes_panel.header.notes_of', { date: formattedDate }) }}</h2>
                            <input
                                v-if="selectedNote"
                                v-model="noteSubtitle"
                                type="text"
                                :placeholder="$t('components.notes_panel.header.subtitle_placeholder')"
                                class="flex-1 text-sm bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none text-gray-600 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                spellcheck="false"
                            />
                        </div>
                        <div v-if="selectedNote" class="text-sm text-gray-500 dark:text-gray-400">
                            {{ formatNoteTime(selectedNote.date) }}
                        </div>
                    </div>
                    <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="sm" @click="closePanel" />
                </div>

                <!-- Éditeur Markdown -->
                <div class="flex-1 overflow-hidden flex flex-col w-full">
                    <CommonNoteEditor
                        ref="noteEditor"
                        :model-value="editorContent"
                        :readonly="false"
                        :hide-fullscreen="false"
                        :fill-height="true"
                        @update:model-value="editorContent = $event"
                        @clear="editorContent = ''"
                    />
                </div>

                <!-- Pied de page -->
                <div class="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-center">
                    <div class="flex gap-2">
                        <UButton :label="$t('common.actions.save')" color="primary" :loading="loading" :disabled="loading" @click="saveNote" />
                        <UButton :label="$t('common.actions.save_and_close')" color="primary" variant="soft" :loading="loading" :disabled="loading" @click="saveAndClose" />
                        <UButton :label="$t('common.actions.cancel')" color="neutral" variant="ghost" :disabled="loading" @click="closePanel" />
                    </div>
                </div>
            </div>
        </div>
    </Transition>

    <!-- Modal modifications non sauvegardées -->
    <CommonModalDefault v-model:open="showUnsavedModal" :title="$t('components.notes_panel.unsaved_modal.title')">
        <template #content>
            <p>{{ $t('components.notes_panel.unsaved_modal.content') }}</p>
        </template>
        <template #footer>
            <div class="flex gap-4 justify-end">
                <UButton :label="$t('common.actions.save')" color="primary" :loading="loading" @click="onUnsavedSaveAndContinue" />
                <UButton :label="$t('common.actions.cancel')" color="neutral" variant="ghost" @click="() => { showUnsavedModal = false; pendingAction = null }" />
                <UButton :label="$t('components.notes_panel.unsaved_modal.discard')" color="error" variant="ghost" @click="onUnsavedDiscard" />
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
import { formatDateLongString, formatDateToYYYYMMDD } from '~/utils/date-utils'

import type { NoteType } from '~/schema/note'

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
const { fetchNote, fetchNoteDates, saveNote: saveNoteToApi, deleteNote } = useNotes()
const { log_error } = useLogView()
const { success: toastSuccess } = useAppToast()
const userStore = useUserStore()

const loading = ref(false)
const noteDates = ref<NoteType[]>([])
const selectedNote = ref<NoteType | null>(null)
const showDeleteModal = ref(false)
const noteToDelete = ref<NoteType | null>(null)
const showUnsavedModal = ref(false)
const savedContent = ref('')
const pendingAction = ref<(() => void) | null>(null)

const editorContent = ref('')
const noteEditor = ref<{ getContent: () => string, setContent: (v: string) => Promise<void> } | null>(null)
const getContent = () => editorContent.value
const setContent = async (v: string) => { editorContent.value = v }

const noteSubtitle = ref('')
const savedSubtitle = ref('')
const isDirty = computed(() =>
    editorContent.value.trim() !== savedContent.value.trim() ||
    noteSubtitle.value !== savedSubtitle.value
)

const { t, locale } = useI18n()

// Grouper les notes par date
const noteDatesGrouped = computed(() => {
    const grouped = new Map<string, NoteType[]>()
    
    noteDates.value.forEach((note: NoteType) => {
        const dateKey = formatDateToYYYYMMDD(note.date)
        if (!grouped.has(dateKey)) {
            grouped.set(dateKey, [])
        }
        grouped.get(dateKey)!.push(note)
    })
    
    // Trier les notes par heure (plus récent en premier)
    grouped.forEach(notes => {
        notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })
    
    // Convertir en tableau et trier par date
    return Array.from(grouped.entries())
        .map(([date, notes]) => ({ date, notes }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const selectedNoteId = computed(() => selectedNote.value?.id || null)

const formattedDate = computed(() => formatDateLongString(props.selectedDate, locale.value))

// Formater l'heure d'une note
const formatNoteTime = (date: string | Date) => {
    const d = new Date(date)
    return d.toLocaleTimeString(locale.value, { 
        hour: '2-digit', 
        minute: '2-digit' 
    })
}

const doSelectNote = (note: NoteType) => {
    selectedNote.value = note
    userStore.setLastViewedNoteId(note.id ?? null)
    const subtitle = note.metadata?.subtitle || ''
    noteSubtitle.value = subtitle
    savedSubtitle.value = subtitle
    const c = note.content || ''
    savedContent.value = c
    setContent(c)
}

// Sélectionner une note spécifique
const selectNote = (note: NoteType) => {
    if (isDirty.value && selectedNote.value) {
        pendingAction.value = () => doSelectNote(note)
        showUnsavedModal.value = true
        return
    }
    doSelectNote(note)
}

// Créer une nouvelle note pour une date donnée
const createNewNote = (date: string) => {
    const parsed = new Date(date)
    const now = new Date()
    parsed.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
    const newNote: Partial<NoteType> = {
        date: parsed.toISOString(),
        content: '',
        metadata: {}
    }

    noteSubtitle.value = ''
    savedSubtitle.value = ''
    selectedNote.value = newNote as NoteType
    setContent('')
}


// Charger les notes existantes
const loadNotes = async () => {
    try {
        const dates = await fetchNoteDates()
        noteDates.value = dates as NoteType[]
        
        // Restaurer la dernière note vue, sinon sélectionner la plus récente
        if (!selectedNote.value && noteDates.value.length > 0) {
            const lastId = userStore.lastViewedNoteId
            const lastNote = lastId ? noteDates.value.find((n: NoteType) => n.id === lastId) : null
            const noteToSelect = lastNote ?? noteDates.value.sort((a: NoteType, b: NoteType) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )[0]
            selectNote(noteToSelect)
        }
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        log_error(message)
    }
}

// Sauvegarder la note
const saveNote = async () => {
    if (!selectedNote.value) return

    try {
        const noteContent = getContent().trim()
        const noteData = {
            date: selectedNote.value.date,
            content: noteContent,
            metadata: { ...(selectedNote.value.metadata || {}), subtitle: noteSubtitle.value }
        }

        if (noteContent) {
            // Save or update the note
            const savedNote = await saveNoteToApi(noteData)

            if (savedNote) {
                selectedNote.value = savedNote
                savedContent.value = noteContent
                savedSubtitle.value = noteSubtitle.value
                await setContent(noteContent)
                await loadNotes() // Recharger la liste

                toastSuccess(t('components.notes_panel.toast.save_success_title'), t('components.notes_panel.toast.save_success_desc'))

                emit('save', { date: savedNote.date, note: noteContent })
            }
        } else if (selectedNote.value.id) {
            // If note is empty and has no metadata, delete it
            const success = await deleteNote(selectedNote.value.id)
            if (success) {
                selectedNote.value = null
                setContent('')
                await loadNotes() // Recharger la liste

                toastSuccess(t('components.notes_panel.toast.delete_success_title'), t('components.notes_panel.toast.delete_success_desc'))

                emit('save', { date: noteData.date, note: '' })
            }
        }
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        log_error(message)
    }
}

const saveAndClose = async () => {
    await saveNote()
    closePanel()
}

const onUnsavedDiscard = () => {
    showUnsavedModal.value = false
    savedContent.value = getContent()
    if (pendingAction.value) {
        pendingAction.value()
        pendingAction.value = null
    }
}

const onUnsavedSaveAndContinue = async () => {
    await saveNote()
    showUnsavedModal.value = false
    if (pendingAction.value) {
        pendingAction.value()
        pendingAction.value = null
    }
}

// Fermer le panneau
const closePanel = () => {
    if (isDirty.value) {
        pendingAction.value = () => emit('close')
        showUnsavedModal.value = true
        return
    }
    emit('close')
}

// Confirmer la suppression d'une note
const confirmDeleteNote = (note: NoteType) => {
    noteToDelete.value = note
    showDeleteModal.value = true
}

// Supprimer une note après confirmation
const deleteNoteConfirmed = async () => {
    if (!noteToDelete.value || !noteToDelete.value.id) return

    try {
        loading.value = true
        const success = await deleteNote(noteToDelete.value.id)

        if (success) {
            if (selectedNote.value?.id === noteToDelete.value.id) {
                selectedNote.value = null
                userStore.setLastViewedNoteId(null)
                setContent('')
            }

            await loadNotes()

            toastSuccess(t('components.notes_panel.toast.delete_success_title'), t('components.notes_panel.toast.delete_success_desc'))
        }
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        log_error(message)
    } finally {
        loading.value = false
        showDeleteModal.value = false
        noteToDelete.value = null
    }
}

// Surveiller l'ouverture/fermeture du panneau
watch(
    () => props.isOpen,
    async (isOpen: boolean) => {
        if (isOpen) {
            selectedNote.value = null
            await loadNotes() // Charger les notes à l'ouverture
        }
    },
    { immediate: true }
)

// Gérer Ctrl+S pour sauvegarder et fermer, Echap pour fermer
const handleKeyDown = async (e: KeyboardEvent) => {
    if (!e.key) return
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (props.isOpen) {
            e.preventDefault()
            await saveNote()
        }
    } else if (e.key.toLowerCase() === 'escape') {
        if (props.isOpen) {
            e.preventDefault()
            closePanel()
        }
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown)
})

defineExpose({
    saveNote,
    createNewNote,
    selectNote
})
</script>
