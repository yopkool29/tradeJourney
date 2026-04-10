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
                        <h2 class="text-lg font-semibold">{{ $t('components.notes_panel.header.notes_of', { date: formattedDate }) }}</h2>
                        <div v-if="selectedNote" class="text-sm text-gray-500 dark:text-gray-400">
                            {{ formatNoteTime(selectedNote.date) }}
                        </div>
                    </div>
                    <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="sm" @click="closePanel" />
                </div>

                <!-- Éditeur Markdown -->
                <div class="flex-1 overflow-hidden flex flex-col w-full">
                    <!-- Zone d'édition Milkdown -->
                    <div class="flex-1 overflow-auto p-0">
                        <div
                            ref="editorContainer"
                            class="milkdown-editor h-full w-full relative"
                            style="min-height: 400px;"
                        >
                            <div v-if="editorLoading" class="absolute inset-0 flex items-center justify-center">
                                <div class="text-gray-500 dark:text-gray-400">Chargement...</div>
                            </div>
                        </div>
                    </div>
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
                <UButton :label="$t('components.notes_panel.unsaved_modal.discard')" color="error" variant="ghost" @click="onUnsavedDiscard" />
                <UButton :label="$t('common.actions.cancel')" color="neutral" variant="ghost" @click="() => { showUnsavedModal = false; pendingAction = null }" />
                <UButton :label="$t('common.actions.save')" color="primary" :loading="loading" @click="onUnsavedSaveAndContinue" />
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
// Importer les styles CSS pour Crepe
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

import { useMilkdownEditor } from '~/composables/useMilkdownEditor'
import { useNotes } from '~/composables/useNotes'
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

// État pour l'éditeur Milkdown
const { 
    editor: milkdownEditor, 
    loading: editorLoading, 
    containerRef: editorContainer,
    getContent, 
    setContent 
} = useMilkdownEditor('')

const isDirty = computed(() => getContent().trim() !== savedContent.value.trim())

const { t, locale } = useI18n()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// Grouper les notes par date
const noteDatesGrouped = computed(() => {
    const grouped = new Map<string, NoteType[]>()
    
    noteDates.value.forEach(note => {
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

// Formater la date pour l'affichage
const formattedDate = computed(() => {
    return formatDateLongString(props.selectedDate, locale.value)
})

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
    
    selectedNote.value = newNote as NoteType
    setContent('')
}


// Charger les dates des notes existantes
const loadNoteDates = async () => {
    try {
        const dates = await fetchNoteDates()
        noteDates.value = dates as NoteType[]
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        log_error(message)
    }
}

// Charger les notes existantes
const loadNotes = async () => {
    try {
        const dates = await fetchNoteDates()
        noteDates.value = dates as NoteType[]
        
        // Restaurer la dernière note vue, sinon sélectionner la plus récente
        if (!selectedNote.value && noteDates.value.length > 0) {
            const lastId = userStore.lastViewedNoteId
            const lastNote = lastId ? noteDates.value.find(n => n.id === lastId) : null
            const noteToSelect = lastNote ?? noteDates.value.sort((a, b) =>
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
            metadata: selectedNote.value.metadata || {}
        }

        if (noteContent) {
            // Save or update the note
            const savedNote = await saveNoteToApi(noteData)

            if (savedNote) {
                selectedNote.value = savedNote
                savedContent.value = noteContent
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
    async (isOpen) => {
        if (isOpen) {
            selectedNote.value = null
            await loadNotes() // Charger les notes à l'ouverture
        }
    },
    { immediate: true }
)

// Gérer Ctrl+S pour sauvegarder et fermer, Echap pour fermer
const handleKeyDown = async (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (props.isOpen) {
            e.preventDefault()
            // console.log("handleKeyDown")
            await saveNote()
        }
    } else if (e.key === 'Escape') {
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
    createNewNote: (date: string) => createNewNote(date),
    selectNote: (note: NoteType) => selectNote(note)
})
</script>

<style lang="scss" scoped>
/* Styles pour Milkdown */
.milkdown-editor {
    min-height: 400px;
}

.dark .milkdown-editor {
    border-color: #374151;
    background: #1f2937;
}

/* Override crepe variables pour rendre les icônes toolbar plus visibles */
.milkdown-editor :deep(.milkdown) {
    --crepe-color-outline: #555555;
    --crepe-color-primary: #1a1a1a;
}

/* Styles pour le mode sombre de Milkdown */
.dark .milkdown-editor :deep(.milkdown) {
    --crepe-color-background: #1f2937;
    --crepe-color-on-background: #f3f4f6;
    --crepe-color-surface: #374151;
    --crepe-color-surface-low: #1f2937;
    --crepe-color-on-surface: #f3f4f6;
    --crepe-color-on-surface-variant: #d1d5db;
    --crepe-color-outline: #9ca3af;
    --crepe-color-primary: #e5e7eb;
    --crepe-color-hover: #4b5563;
    --crepe-color-selected: #6b7280;
    background: #1f2937;
    color: #f3f4f6;
}

.dark .milkdown-editor :deep(.milkdown .editor) {
    background: #1f2937;
    color: #f3f4f6;
}

.dark .milkdown-editor :deep(.milkdown .editor p) {
    color: #f3f4f6;
}

.dark .milkdown-editor :deep(.milkdown .editor h1),
.dark .milkdown-editor :deep(.milkdown .editor h2),
.dark .milkdown-editor :deep(.milkdown .editor h3),
.dark .milkdown-editor :deep(.milkdown .editor h4),
.dark .milkdown-editor :deep(.milkdown .editor h5),
.dark .milkdown-editor :deep(.milkdown .editor h6) {
    color: #f3f4f6;
}

.dark .milkdown-editor :deep(.milkdown .editor ul),
.dark .milkdown-editor :deep(.milkdown .editor ol) {
    color: #f3f4f6;
}

.dark .milkdown-editor :deep(.milkdown .editor blockquote) {
    color: #d1d5db;
    border-left-color: #4b5563;
}

.dark .milkdown-editor :deep(.milkdown .editor code) {
    background: #374151;
    color: #f3f4f6;
}

.dark .milkdown-editor :deep(.milkdown .editor pre) {
    background: #111827;
    color: #f3f4f6;
}

.dark .milkdown-editor :deep(.milkdown .editor table) {
    color: #f3f4f6;
}

.dark .milkdown-editor :deep(.milkdown .editor table th),
.dark .milkdown-editor :deep(.milkdown .editor table td) {
    border-color: #4b5563;
}

.dark .milkdown-editor :deep(.milkdown .editor a) {
    color: #60a5fa;
}

.dark .milkdown-editor :deep(.milkdown .editor a:hover) {
    color: #93c5fd;
}

/* Focus states */
.milkdown-editor :deep(.milkdown .editor.ProseMirror:focus) {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    border-radius: 0.375rem;
}

/* Selection */
.milkdown-editor :deep(.milkdown .editor.ProseMirror ::selection) {
    background: rgba(59, 130, 246, 0.2);
}

.dark .milkdown-editor :deep(.milkdown .editor.ProseMirror ::selection) {
    background: rgba(59, 130, 246, 0.3);
}

.milkdown-editor :deep(.milkdown) {
    background: transparent;
    color: inherit;
    
    .editor {
        outline: none;
        padding: 1rem;
        
        p {
            margin: 0.5em 0;
            line-height: 1.6;
        }
        
        h1, h2, h3, h4, h5, h6 {
            font-weight: 600;
            margin: 1.5em 0 0.5em;
            line-height: 1.3;
            
            &:first-child {
                margin-top: 0;
            }
        }
        
        h1 { font-size: 1.8em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1.1em; }
        h5, h6 { font-size: 1em; }
        
        ul, ol {
            padding-left: 1.5rem;
            margin: 0.5em 0;
        }
        
        blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1rem;
            margin: 1em 0;
            color: #6b7280;
            
            .dark & {
                border-left-color: #4b5563;
                color: #9ca3af;
            }
        }
        
        code {
            background: #f3f4f6;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-family: ui-monospace, SFMono-Regular, monospace;
            font-size: 0.875em;
            
            .dark & {
                background: #374151;
            }
        }
        
        pre {
            background: #f3f4f6;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            margin: 1em 0;
            
            .dark & {
                background: #1f2937;
            }
            
            code {
                background: transparent;
                padding: 0;
            }
        }
        
        img {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
            margin: 1em 0;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
            
            th, td {
                border: 1px solid #e5e7eb;
                padding: 0.5rem;
                text-align: left;
                
                .dark & {
                    border-color: #4b5563;
                }
            }
            
            th {
                background: #f9fafb;
                font-weight: 600;
                overflow-x: auto;
                margin: 1em 0;
                
                .dark & {
                    background: #1f2937;
                }
                
                code {
                    background: transparent;
                    padding: 0;
                }
            }
            
            img {
                max-width: 100%;
                height: auto;
                border-radius: 0.5rem;
                margin: 1em 0;
            }
            
            table {
                border-collapse: collapse;
                width: 100%;
                margin: 1em 0;
                
                th, td {
                    border: 1px solid #e5e7eb;
                    padding: 0.5rem;
                    text-align: left;
                    
                    .dark & {
                        border-color: #4b5563;
                    }
                }
                
                th {
                    background: #f9fafb;
                    font-weight: 600;
                    
                    .dark & {
                        background: #1f2937;
                    }
                }
            }
            
            hr {
                border: none;
                border-top: 1px solid #e5e7eb;
                margin: 2em 0;
                
                .dark & {
                    border-top-color: #4b5563;
                }
            }
        }
    }
}
</style>
