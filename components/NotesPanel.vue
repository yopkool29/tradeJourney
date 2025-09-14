<template>
    <div
        class="fixed left-0 top-0 h-full bg-white dark:bg-gray-800 shadow-lg z-50 transition-all duration-300 ease-in-out flex"
        :class="{ 'translate-x-0': isOpen, '-translate-x-full': !isOpen }"
        style="width: 800px; max-width: 90vw"
    >
        <!-- Liste des dates avec des notes -->
        <div class="w-42 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">{{ $t('components.notes_panel.sidebar.title') }}</h3>
                <div class="space-y-1">
                    <div
                        v-for="item in noteDates"
                        :key="format(item.date, 'yyyy-MM-dd')"
                        :class="{
                            'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-200': isActiveDate(format(item.date, 'yyyy-MM-dd')),
                            'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800': !isActiveDate(
                                format(item.date, 'yyyy-MM-dd')
                            ),
                        }"
                        class="px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors flex justify-between items-center"
                    >
                        <span @click="selectNoteDate(format(item.date, 'yyyy-MM-dd'))">{{ formatDateLong(item.date, locale) }}</span>
                        <UButton
                            icon="i-heroicons-trash"
                            color="error"
                            variant="ghost"
                            size="xs"
                            :title="$t('components.notes_panel.sidebar.delete_note')"
                            @click.stop="confirmDeleteNote(item)"
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- Éditeur principal -->
        <div class="flex-1 flex flex-col h-full">
            <!-- En-tête -->
            <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 class="text-lg font-semibold">{{ $t('components.notes_panel.header.notes_of', { date: formattedDate }) }}</h2>
                <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="sm" @click="closePanel" />
            </div>

            <!-- Éditeur Tiptap -->
            <div class="flex-1 overflow-hidden flex flex-col w-full">
                <!-- Barre d'outils -->
                <div v-if="editor" class="border-b border-gray-200 dark:border-gray-700 p-1 flex flex-wrap gap-1">
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.bold')"
                        icon="i-heroicons-bold"
                        color="neutral"
                        :variant="editor.isActive('bold') ? 'solid' : 'ghost'"
                        size="xs"
                        @click="editor.chain().focus().toggleBold().run()"
                    />
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.italic')"
                        icon="i-heroicons-italic"
                        color="neutral"
                        :variant="editor.isActive('italic') ? 'solid' : 'ghost'"
                        size="xs"
                        @click="editor.chain().focus().toggleItalic().run()"
                    />
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.underline')"
                        icon="i-heroicons-underline"
                        color="neutral"
                        :variant="editor.isActive('underline') ? 'solid' : 'ghost'"
                        size="xs"
                        @click="editor.chain().focus().toggleUnderline().run()"
                    />
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.strikethrough')"
                        icon="i-heroicons-strikethrough"
                        color="neutral"
                        :variant="editor.isActive('strike') ? 'solid' : 'ghost'"
                        size="xs"
                        @click="editor.chain().focus().toggleStrike().run()"
                    />
                    <div class="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.bullet_list')"
                        icon="i-heroicons-list-bullet"
                        color="neutral"
                        :variant="editor.isActive('bulletList') ? 'solid' : 'ghost'"
                        size="xs"
                        @click="editor.chain().focus().toggleBulletList().run()"
                    />
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.ordered_list')"
                        icon="i-heroicons-list-bullet"
                        color="neutral"
                        :variant="editor.isActive('orderedList') ? 'solid' : 'ghost'"
                        size="xs"
                        @click="editor.chain().focus().toggleOrderedList().run()"
                    />
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.code_block')"
                        icon="i-heroicons-code-bracket"
                        color="neutral"
                        :variant="editor.isActive('codeBlock') ? 'solid' : 'ghost'"
                        size="xs"
                        @click="editor.chain().focus().toggleCodeBlock().run()"
                    />
                    <div class="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.heading1')"
                        color="neutral"
                        :variant="editor.isActive('heading', { level: 1 }) ? 'solid' : 'ghost'"
                        size="xs"
                        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
                    >
                        H1
                    </UButton>
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.heading2')"
                        color="neutral"
                        :variant="editor.isActive('heading', { level: 2 }) ? 'solid' : 'ghost'"
                        size="xs"
                        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                    >
                        H2
                    </UButton>
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.heading3')"
                        color="neutral"
                        :variant="editor.isActive('heading', { level: 3 }) ? 'solid' : 'ghost'"
                        size="xs"
                        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                    >
                        H3
                    </UButton>
                    <div class="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.horizontal_rule')"
                        icon="i-heroicons-minus"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        @click="editor.chain().focus().setHorizontalRule().run()"
                    />
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.undo')"
                        icon="i-heroicons-arrow-uturn-left"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        :disabled="!editor.can().undo()"
                        @click="editor.chain().focus().undo().run()"
                    />
                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.redo')"
                        icon="i-heroicons-arrow-uturn-right"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        :disabled="!editor.can().redo()"
                        @click="editor.chain().focus().redo().run()"
                    />
                    <div class="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <div class="relative group">
                        <UButton
                            icon="i-heroicons-swatch"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            :class="{ '!bg-primary-100 dark:!bg-primary-900': editor?.getAttributes('textStyle')?.color }"
                        />
                        <input
                            type="color"
                            :value="editor?.getAttributes('textStyle')?.color || '#000000'"
                            class="absolute bottom-0 left-0 w-6 h-6 opacity-0 cursor-pointer"
                            @input="
                                (e: Event) => {
                                    const target = e.target as HTMLInputElement
                                    editor?.chain().focus().setColor(target.value).run()
                                }
                            "
                        />
                    </div>

                    <UButton
                        :title="$t('components.notes_panel.editor.toolbar.unset_color')"
                        icon="i-heroicons-no-symbol"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        @click="editor.chain().focus().unsetColor().run()"
                    />


                </div>

                <!-- Zone d'édition -->
                <div class="flex-1 overflow-auto p-4">
                    <TiptapEditorContent :editor="editor" class="h-full w-[550px]" />
                </div>
            </div>

            <!-- Pied de page -->
            <div class="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-center">
                <div class="flex gap-2">
                    <UButton :label="$t('common.actions.save')" color="primary" :loading="loading" :disabled="loading" @click="saveNote" />
                    <UButton :label="$t('common.actions.cancel')" color="neutral" variant="ghost" :disabled="loading" @click="closePanel" />
                </div>
            </div>
        </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <CommonModalDelete v-model:open="showDeleteModal" :title="$t('components.notes_panel.delete_modal.title')" @confirm="deleteNoteConfirmed">
        <template #content>
            <p class="mb-4">
                {{ $t('components.notes_panel.delete_modal.content', { date: noteToDelete?.date ? formatDateLong(noteToDelete.date, locale) : '' }) }}
            </p>
        </template>
    </CommonModalDelete>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Typography from '@tiptap/extension-typography'
import Placeholder from '@tiptap/extension-placeholder'
import TextStyle from '@tiptap/extension-text-style'
import { useEditor } from '@tiptap/vue-3'
import Color from '@tiptap/extension-color'
import BulletList from '@tiptap/extension-bullet-list'
import ListItem from '@tiptap/extension-list-item'
import OrderedList from '@tiptap/extension-ordered-list'
import Heading from '@tiptap/extension-heading'
import CodeBlock from '@tiptap/extension-code-block'
import { useNotes } from '~/composables/useNotes'

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
const toast = useToast()

const loading = ref(false)
const currentNote = ref('')
const noteDates = ref<NoteType[]>([])
const currentNoteId = ref<number | null>(null)
const showDeleteModal = ref(false)
const noteToDelete = ref<NoteType | null>(null)

const { t, locale } = useI18n()

// Formater la date pour l'affichage
const formattedDate = computed(() => {
    return formatDateLong(props.selectedDate, locale.value)
})

// Vérifier si une date est active
const isActiveDate = (dateKey: string) => {
    return format(props.selectedDate, 'yyyy-MM-dd') === dateKey
}

// Sélectionner une date de note
const selectNoteDate = (dateKey: string) => {
    emit('update:selectedDate', dateKey)
}

// Initialiser l'éditeur Tiptap
const editor = useEditor({
    content: currentNote.value,
    extensions: [
        TiptapStarterKit.configure({
            bulletList: false, // Désactive la liste à puces du starter kit
            orderedList: false, // Désactive la liste ordonnée du starter kit
            heading: false, // Désactive le titre du starter kit pour le configurer manuellement
            codeBlock: false, // Désactive le bloc de code du starter kit pour le configurer manuellement
        }),
        Underline,
        TextStyle,
        Color,
        TextAlign.configure({
            types: ['heading', 'paragraph'],
        }),
        Typography,
        Placeholder.configure({
            placeholder: t('components.notes_panel.editor.placeholder'),
        }),
        // Configurer manuellement les extensions de listes
        BulletList.configure({
            HTMLAttributes: {
                class: 'list-disc pl-6',
            },
        }),
        OrderedList.configure({
            HTMLAttributes: {
                class: 'list-decimal pl-6',
            },
        }),
        ListItem,
        // Configuration personnalisée pour les titres
        Heading.configure({
            levels: [1, 2, 3],
            HTMLAttributes: {
                class: 'font-bold',
            },
        }),
        // Configuration personnalisée pour les blocs de code
        CodeBlock.configure({
            HTMLAttributes: {
                class: 'bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono text-sm',
            },
        }),
    ],
    editorProps: {
        attributes: {
            class: 'max-w-none focus:outline-none min-h-[200px] p-4 text-md leading-relaxed text-gray-800 dark:text-gray-200 font-mono ',
        },
    },
    onUpdate: ({ editor }) => {
        currentNote.value = editor.getHTML()
    },
})

// Charger les dates des notes existantes
const loadNoteDates = async () => {
    try {
        const dates = await fetchNoteDates()
        noteDates.value = dates as NoteType[]
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        log_error(message)
    }
}

// Charger la note existante pour la date sélectionnée
const loadNoteToday = async () => {
    if (!editor.value) return

    try {
        const note = await fetchNote(props.selectedDate)
        let noteContent = ''

        if (!note) {
            currentNoteId.value = -1
        } else {
            currentNoteId.value = (note as NoteType).id || null
            noteContent = (note as NoteType).content || ''
        }

        editor.value.commands.setContent(noteContent)
        currentNote.value = noteContent
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        log_error(message)
    }
}

// Sauvegarder la note
const saveNote = async () => {
    if (!editor.value) return

    console.log('Saving note...')

    try {
        const dateKey = format(props.selectedDate, 'yyyy-MM-dd')
        const noteContent = currentNote.value.trim()

        if (noteContent) {
            // Save or update the note
            const savedNote = await saveNoteToApi({
                date: dateKey,
                content: noteContent,
            })

            if (savedNote) {
                currentNoteId.value = savedNote.id || null
                // Ne pas recharger toute la liste, juste mettre à jour l'état local

                toast.add({
                    title: t('components.notes_panel.toast.save_success_title'),
                    description: t('components.notes_panel.toast.save_success_desc'),
                    color: 'success',
                    duration: 2000,
                })

                emit('save', { date: props.selectedDate, note: noteContent })
            }
        } else if (currentNoteId.value) {
            // If note is empty and exists, delete it
            if (currentNoteId.value) {
                const success = await deleteNote(currentNoteId.value)
                if (success) {
                    currentNoteId.value = null
                    // Ne pas recharger toute la liste, juste mettre à jour l'état local

                    toast.add({
                        title: t('components.notes_panel.toast.delete_success_title'),
                        description: t('components.notes_panel.toast.delete_success_desc'),
                        color: 'success',
                        duration: 2000,
                    })

                    emit('save', { date: props.selectedDate, note: '' })
                }
            }
        }
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        log_error(message)
    }
}

// Fermer le panneau
const closePanel = () => {
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
            // Supprimer la note de la liste locale
            noteDates.value = noteDates.value.filter((item) => format(item.date, 'yyyy-MM-dd') !== format(noteToDelete.value!.date, 'yyyy-MM-dd'))

            // Si la note supprimée est celle actuellement affichée, réinitialiser l'éditeur
            if (format(props.selectedDate, 'yyyy-MM-dd') === format(noteToDelete.value.date, 'yyyy-MM-dd')) {
                editor.value?.commands.setContent('')
                currentNote.value = ''
                currentNoteId.value = null
            }

            toast.add({
                title: t('components.notes_panel.toast.delete_success_title'),
                description: t('components.notes_panel.toast.delete_success_desc'),
                color: 'success',
                duration: 2000,
            })
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

// Surveiller le changement de date
watch(
    () => props.selectedDate,
    () => {
        if (props.isOpen) {
            loadNoteToday()
        }
    }
)

// Surveiller l'ouverture/fermeture du panneau
watch(
    () => props.isOpen,
    async (isOpen) => {
        if (isOpen) {
            await loadNoteDates() // Charger les dates à l'ouverture
            await loadNoteToday()
        }
    },
    { immediate: true }
)

onBeforeUnmount(() => {
    const editorInstance = unref(editor)
    if (editorInstance) {
        editorInstance.destroy()
    }
})

defineExpose({
    saveNote,
})
</script>

<style lang="scss" scoped>
/* Basic editor styles */
:deep(.ProseMirror) {
    /* Reset pour le premier élément */
    > *:first-child {
        margin-top: 0;
    }

    /* Styles des titres */
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        line-height: 1.3;
        font-weight: 600;
        color: var(--color-gray-900);
        margin: 1.5em 0 0.5em;

        &:first-child {
            margin-top: 0;
        }
    }

    h1 {
        font-size: 1.8em;
        margin-top: 2em;
    }

    h2 {
        font-size: 1.5em;
        margin-top: 1.8em;
    }

    h3 {
        font-size: 1.25em;
        margin-top: 1.6em;
    }

    h4 {
        font-size: 1.1em;
        margin-top: 1.4em;
    }

    h5,
    h6 {
        font-size: 1em;
        margin-top: 1.2em;
    }

    /* Support du mode sombre */
    @media (prefers-color-scheme: dark) {
        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
            color: var(--color-gray-100);
        }
    }
}
</style>
