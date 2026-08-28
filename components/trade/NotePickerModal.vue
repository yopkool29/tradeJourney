<template>
    <UModal v-model:open="open" :title="$t('components.trade.notePicker.title')" :dismissible="false"
        :ui="{ overlay: 'z-[300]', content: 'z-[301] sm:max-w-xl' }">
        <template #body>
            <div class="p-4 space-y-4">
                <!-- Mode copier/déplacer (affiché quand une note est sélectionnée) -->
                <div v-if="selectedNote" class="border border-default rounded-lg p-4 bg-elevated/50">
                    <p class="text-sm text-muted mb-3">{{
                        $t('components.trade.notePicker.assoc_mode_label') }}</p>
                    <div class="flex gap-3">
                        <UButton :label="$t('components.trade.notePicker.copy')"
                            :color="assocMode === 'copy' ? 'primary' : 'neutral'"
                            :variant="assocMode === 'copy' ? 'solid' : 'outline'" icon="i-heroicons-document-duplicate"
                            @click="assocMode = 'copy'" />
                        <UButton :label="$t('components.trade.notePicker.move')"
                            :color="assocMode === 'move' ? 'primary' : 'neutral'"
                            :variant="assocMode === 'move' ? 'solid' : 'outline'" icon="i-heroicons-arrow-right-circle"
                            @click="assocMode = 'move'" />
                    </div>
                    <p class="text-xs text-dimmed mt-2">
                        {{ assocMode === 'copy' ? $t('components.trade.notePicker.copy_hint') :
                            $t('components.trade.notePicker.move_hint') }}
                    </p>
                </div>

                <!-- Filtres -->
                <div class="flex gap-2">
                    <UInput v-model="searchQuery" :placeholder="$t('components.trade.notePicker.search_placeholder')"
                        icon="i-heroicons-magnifying-glass" class="flex-1" />
                    <UInput v-model="filterDate" type="date" class="w-40"
                        :placeholder="$t('components.trade.notePicker.filter_date')" />
                </div>

                <!-- Loading -->
                <div v-if="loading" class="flex justify-center py-8">
                    <UIcon name="i-heroicons-arrow-path" class="animate-spin text-muted text-2xl" />
                </div>

                <!-- Empty -->
                <div v-else-if="filteredNotes.length === 0" class="py-8 text-center text-muted text-sm">
                    {{ $t('components.trade.notePicker.empty') }}
                </div>

                <!-- Liste notes -->
                <div v-else class="space-y-2 max-h-96 overflow-y-auto">
                    <div v-for="note in filteredNotes" :key="note.id"
                        class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors" :class="selectedNote?.id === note.id
                            ? 'border-primary bg-primary/10'
                            : 'border-default hover:bg-elevated'"
                        @click="selectedNote = note">
                        <div class="flex-1 min-w-0">
                            <div class="flex flex-row gap-x-4 items-baseline">
                                <span class="text-xs font-semibold text-muted shrink-0">
                                    {{ formatDateString(note.date, true, locale as 'fr' | 'en' | 'us') }}
                                </span>
                                <div v-if="getNoteSubtitle(note)"
                                    class="text-sm font-medium text-default truncate">
                                    {{ getNoteSubtitle(note) }}
                                </div>
                            </div>
                            <div class="text-xs text-muted line-clamp-2 mt-0.5">
                                {{ getPreview(note) }}
                            </div>
                        </div>
                        <UIcon v-if="selectedNote?.id === note.id" name="i-heroicons-check-circle"
                            class="text-primary shrink-0 mt-0.5" />
                    </div>
                </div>

                <!-- Aperçu Milkdown de la note sélectionnée -->
                <div v-if="selectedNote" class="border-t border-default pt-4">
                    <CommonNoteEditor :model-value="selectedNote.content || ''" :readonly="true"
                        :hide-fullscreen="true" />
                </div>
            </div>
        </template>
        <template #footer>
            <div class="action-buttons-end px-4 py-3">
                <UButton :label="$t('common.actions.cancel')" color="neutral" variant="ghost" @click="open = false" />
                <UButton :label="$t('components.trade.notePicker.associate')" color="primary" :disabled="!selectedNote"
                    @click="onAssociate" />
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
import type { NoteType } from '~/schema/note'
import { formatDateToYYYYMMDD, formatDateString } from '~/utils/date-utils'

const { locale } = useI18n()
const { fetchNoteDates } = useNotes()
const userStore = useUserStore()

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
    associate: [note: NoteType, mode: 'copy' | 'move']
}>()

const notes = ref<NoteType[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterDate = ref('')
const selectedNote = ref<NoteType | null>(null)
const assocMode = ref<'copy' | 'move'>(userStore.noteAssocMode)

const filteredNotes = computed(() => {
    let result = [...notes.value].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    if (filterDate.value) {
        result = result.filter(n => formatDateToYYYYMMDD(n.date) === filterDate.value)
    }
    if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(n => {
            const subtitle = getNoteSubtitle(n)
            const preview = getPreview(n)
            return subtitle.toLowerCase().includes(q) || preview.toLowerCase().includes(q)
        })
    }
    return result
})

const getNoteSubtitle = (note: NoteType): string => {
    if (!note.metadata) return ''
    const meta = typeof note.metadata === 'string' ? JSON.parse(note.metadata) : note.metadata
    return (meta?.subtitle as string) || ''
}

const getPreview = (note: NoteType): string => {
    if (!note.content) return ''
    return note.content
        .replace(/!\[.*?\]\(data:[^)]+\)/g, '')
        .replace(/!\[.*?\]\([^)]+\)/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/[#*`>\-_[\]]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120)
}

const onAssociate = () => {
    if (!selectedNote.value) return
    userStore.noteAssocMode = assocMode.value
    emit('associate', selectedNote.value, assocMode.value)
    open.value = false
}

const { isTop, push, pop } = useModalStack('notePicker')

const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open.value && isTop.value) {
        e.preventDefault()
        e.stopPropagation()
        open.value = false
    }
}

onMounted(() => { document.addEventListener('keydown', onKeyDown, true) })
onUnmounted(() => { document.removeEventListener('keydown', onKeyDown, true) })

watch(open, async (val) => {
    if (val) push()
    else pop()
    if (!val) return
    loading.value = true
    selectedNote.value = null
    assocMode.value = userStore.noteAssocMode
    try {
        const result = await fetchNoteDates()
        notes.value = (result as NoteType[]) || []
    } finally {
        loading.value = false
    }
})
</script>
