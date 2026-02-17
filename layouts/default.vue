<template>
    <div class="min-h-screen flex flex-col relative">
        <!-- Overlay sombre -->
        <div v-if="isNotesPanelOpen" class="fixed inset-0 bg-black/30 z-40" @click="closeNotesPanel"></div>
        <!-- Le contenu principal -->
        <div class="flex flex-col min-h-screen relative">
            <!-- Bouton flottant pour ouvrir les notes -->
            <div class="fixed left-1 top-10 z-40 sm:top-30">
                <UButton
                    v-if="userStore.user && !isNotesPanelOpen && currentDatabase && !hideHeader"
                    class="shadow-lg rounded-full p-3"
                    icon="i-heroicons-document-text"
                    color="primary"
                    size="lg"
                    @click="openNotesPanel"
                >
                    <span class="sr-only">Notes</span>
                </UButton>
            </div>
            <!-- Header -->
            <AppHeader />

            <main class="flex-grow relative">
                <div class="transition-all duration-300">
                    <slot />
                </div>
                <LoadingDisplay />
            </main>

            <AppFooter />
        </div>

        <!-- Panneau de notes -->
        <div class="relative z-50">
            <NotesPanel
                ref="notesPanelRef"
                :is-open="isNotesPanelOpen"
                :selected-date="selectedDate"
                @close="closeNotesPanel"
                @update:is-open="(val: boolean) => (isNotesPanelOpen = val)"
                @update:selected-date="(date: Date) => (selectedDate = new Date(date))"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import type { NotesPanel } from '#components'

const userStore = useUserStore()
const notesPanelRef = ref<InstanceType<typeof NotesPanel> | null>(null)
const { warning: toastWarning } = useAppToast()
const { t } = useI18n()

const isNotesPanelOpen = ref(false)
const selectedDate = ref(new Date())
const { currentDatabase } = useDatabase()

// Détection d'onglets multiples
const { isMultipleTabsOpen } = useTabDetection()

const hideHeader = useState<boolean>('hideHeader', () => false)
const { isLoading } = useGlobalLoading()
const route = useRoute()

watch(() => route.path, () => {
    isLoading.value = false
})

watch(isMultipleTabsOpen, (isMultiple) => {
    if (isMultiple) {
        toastWarning(t('layout.default.multiple_tabs.title'), t('layout.default.multiple_tabs.description'))
    }
})

const openNotesPanel = () => {
    isNotesPanelOpen.value = true
    // Create date in local timezone to avoid UTC offset issues
    const now = new Date()
    const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    console.log('Opening notes panel with date:', localDate)
    selectedDate.value = localDate
}

const closeNotesPanel = () => {
    isNotesPanelOpen.value = false
}

// Pour permettre d'ouvrir le panneau de notes depuis d'autres composants
defineExpose({
    openNotesPanel,
    closeNotesPanel,
})
</script>
