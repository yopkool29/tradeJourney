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
                            <div class="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {{ formatDateLongString(dateGroup.date, locale) }}
                            </div>
                            <!-- Notes pour cette date -->
                            <div
                                v-for="note in dateGroup.notes"
                                :key="note.id"
                                class="px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors flex justify-between items-center select-none ml-2"
                                :class="{
                                    'bg-primary/10 text-primary': selectedNoteId === note.id,
                                    'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800': selectedNoteId !== note.id,
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
                <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
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
                                class="flex-1 text-sm bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-primary focus:outline-none text-gray-600 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
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
                    <div v-if="!selectedNote" class="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
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
                <div v-if="selectedNote" class="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-center">
                    <div class="flex gap-2">
                        <UButton :label="$t('common.actions.save')" color="primary" :loading="loading" :disabled="loading" @click="saveNote" />
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
            <UForm id="unsavedModalForm" :state="{}" @submit="onUnsavedSaveAndContinue">
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
                    @click="
                        () => {
                            showUnsavedModal = false
                            pendingAction = null
                        }
                    "
                />
                <UButton :label="$t('components.notes_panel.unsaved_modal.discard')" color="error" variant="ghost" @click="onUnsavedDiscard" />
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
const { fetchNoteDates, saveNote: saveNoteToApi, updateNote, deleteNote } = useNotes()
const { log_error } = useLogView()
const { success: toastSuccess } = useAppToast()
const userStore = useUserStore()
const { uploadContext, cleanupOrphanImages, cleanupTmpImages, finalizeImages, deleteNoteImages } = useNoteImages()

const loading = ref(false)
const noteDates = ref<NoteType[]>([])
const selectedNote = ref<NoteType | null>(null)
const showDeleteModal = ref(false)
const noteToDelete = ref<NoteType | null>(null)
const showUnsavedModal = ref(false)
const savedContent = ref('')
const pendingAction = ref<(() => void) | null>(null)

const showCreateModal = ref(false)
const createNoteDate = ref('')
const createNoteTime = ref('')
const createNoteSubtitle = ref('')

const showChangeDateTimeModal = ref(false)
const changeNoteDate = ref('')
const changeNoteTime = ref('')

const editorContent = ref('')
const noteEditor = ref<{ getContent: () => string; setContent: (v: string) => Promise<void> } | null>(null)
const getContent = () => editorContent.value
const setContent = async (v: string) => {
    editorContent.value = v
}

const noteSubtitle = ref('')
const savedSubtitle = ref('')
const isDirty = computed(() => editorContent.value.trim() !== savedContent.value.trim() || noteSubtitle.value !== savedSubtitle.value)
const isNewNote = computed(() => !!selectedNote.value && !selectedNote.value.id)
const showDirtyIndicator = computed(() => isDirty.value || isNewNote.value)

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
    grouped.forEach((notes) => {
        notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })

    // Convertir en tableau et trier par date
    return Array.from(grouped.entries())
        .map(([date, notes]) => ({ date, notes }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const selectedNoteId = computed(() => selectedNote.value?.id || null)

const formattedDate = computed(() => {
    const date = selectedNote.value ? new Date(selectedNote.value.date) : props.selectedDate
    return formatDateLongString(date, locale.value)
})

// Formater l'heure d'une note
const formatNoteTime = (date: string | Date) => {
    const d = new Date(date)
    return d.toLocaleTimeString(locale.value, {
        hour: '2-digit',
        minute: '2-digit',
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

const openCreateModal = () => {
    if (isDirty.value && selectedNote.value) {
        pendingAction.value = () => doOpenCreateModal()
        showUnsavedModal.value = true
        return
    }
    doOpenCreateModal()
}

const doOpenCreateModal = () => {
    const now = new Date()
    createNoteDate.value = formatDateToYYYYMMDD(now)
    createNoteTime.value = now.toTimeString().slice(0, 5)
    createNoteSubtitle.value = ''
    showCreateModal.value = true
}

const openChangeDateTimeModal = () => {
    if (!selectedNote.value) return
    const noteDate = new Date(selectedNote.value.date)
    changeNoteDate.value = formatDateToYYYYMMDD(noteDate)
    changeNoteTime.value = noteDate.toTimeString().slice(0, 5)
    showChangeDateTimeModal.value = true
}

const confirmChangeDateTime = async () => {
    if (!selectedNote.value) return

    const [hours, minutes] = changeNoteTime.value.split(':').map(Number)
    const parsed = new Date(changeNoteDate.value)
    parsed.setHours(hours, minutes, 0, 0)

    try {
        loading.value = true
        await updateNote(selectedNote.value.id, {
            date: parsed.toISOString(),
        })

        showChangeDateTimeModal.value = false
        selectedNote.value.date = parsed.toISOString()
        await loadNotes()
        toastSuccess(t('components.notes_panel.change_datetime_modal.success'))
    } catch (error) {
        log_error('Failed to update note date/time:', error)
    } finally {
        loading.value = false
    }
}

const confirmCreateNote = async () => {
    const [hours, minutes] = createNoteTime.value.split(':').map(Number)
    const parsed = new Date(createNoteDate.value)
    parsed.setHours(hours, minutes, 0, 0)
    const newNote: Partial<NoteType> = {
        date: parsed.toISOString(),
        content: '',
        metadata: { subtitle: createNoteSubtitle.value },
    }
    noteSubtitle.value = createNoteSubtitle.value
    savedSubtitle.value = ''
    savedContent.value = ''
    selectedNote.value = newNote as NoteType
    setContent('')
    showCreateModal.value = false
}

// Créer une nouvelle note pour une date donnée
const createNewNote = (date: string) => {
    if (isDirty.value && selectedNote.value) {
        pendingAction.value = () => doCreateNewNote(date)
        showUnsavedModal.value = true
        return
    }
    doCreateNewNote(date)
}

const doCreateNewNote = (date: string) => {
    const parsed = new Date(date)
    const now = new Date()
    parsed.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
    const newNote: Partial<NoteType> = {
        date: parsed.toISOString(),
        content: '',
        metadata: {},
    }

    noteSubtitle.value = ''
    savedSubtitle.value = ''
    savedContent.value = ''
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
            const noteToSelect =
                lastNote ?? [...noteDates.value].sort((a: NoteType, b: NoteType) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
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
            subtitle: noteSubtitle.value,
        }

        if (noteContent) {
            // Save or update the note
            const savedNote = selectedNote.value.id ? await updateNote(selectedNote.value.id, noteData) : await saveNoteToApi(noteData)

            if (savedNote) {
                // Finaliser les images tmp_nt_* et nettoyer les orphelins
                const finalContent = await finalizeImages(savedNote.id!, noteContent)
                await cleanupOrphanImages(savedContent.value, finalContent)

                if (finalContent !== noteContent) {
                    await updateNote(savedNote.id!, { content: finalContent })
                    savedNote.content = finalContent
                }

                selectedNote.value = savedNote
                savedContent.value = finalContent
                savedSubtitle.value = noteSubtitle.value
                await setContent(finalContent)
                await loadNotes() // Recharger la liste

                toastSuccess(t('components.notes_panel.toast.save_success_title'), t('components.notes_panel.toast.save_success_desc'))

                emit('save', { date: savedNote.date, note: noteContent })
            }
        } else if (selectedNote.value.id) {
            // If note is empty and has no metadata, delete it
            // First cleanup orphan images (all images since content is empty)
            await cleanupOrphanImages(savedContent.value, '')
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
    emit('close')
}

const onUnsavedDiscard = () => {
    showUnsavedModal.value = false
    const currentContent = getContent()
    if (currentContent.includes('tmp_nt_')) {
        cleanupTmpImages()
    }
    savedContent.value = currentContent
    if (pendingAction.value) {
        pendingAction.value()
        pendingAction.value = null
    }
}

const onUnsavedSaveAndContinue = async () => {
    await saveNote()
    showUnsavedModal.value = false
    const action = pendingAction.value
    pendingAction.value = null
    if (action) {
        action()
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

        // Delete associated images first
        if (noteToDelete.value.content) {
            await deleteNoteImages(noteToDelete.value.content)
        }

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

watch(selectedNote, (note) => {
    if (!note) {
        editorContent.value = ''
        noteSubtitle.value = ''
        savedContent.value = ''
        savedSubtitle.value = ''
    }
})

// Surveiller l'ouverture/fermeture du panneau
watch(
    () => props.isOpen,
    async (isOpen: boolean) => {
        if (isOpen) {
            selectedNote.value = null
            await loadNotes() // Charger les notes à l'ouverture
        } else {
            cleanupTmpImages()
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
    selectNote,
})
</script>
