<template>
    <div class="min-h-screen flex flex-col relative">
        <!-- Overlay sombre -->
        <div v-if="isNotesPanelOpen" class="fixed inset-0 bg-black/30 z-40" @click="closeNotesPanel"></div>
        <!-- Le contenu principal -->
        <div class="flex flex-col min-h-screen relative">
            <!-- Bouton flottant pour ouvrir les notes -->
            <div class="fixed left-4 top-20 z-40">
                <UButton
                    v-if="userStore.user && !isNotesPanelOpen"
                    class="shadow-lg rounded-full p-3"
                    icon="i-heroicons-document-text"
                    color="primary"
                    size="lg"
                    @click="openNotesPanel"
                >
                    <span class="sr-only">Notes</span>
                </UButton>
            </div>
            <AppHeader>
                <template #right>
                    <UButton
                        v-if="!isNotesPanelOpen"
                        class="hidden md:inline-flex"
                        icon="i-heroicons-document-text"
                        color="neutral"
                        variant="ghost"
                        @click="openNotesPanel"
                    >
                        Notes
                    </UButton>
                </template>
            </AppHeader>

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
                @update:selected-date="(date: Date) => (selectedDate = date)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import type { NotesPanel } from '#components'

const userStore = useUserStore()
const notesPanelRef = ref<InstanceType<typeof NotesPanel> | null>(null)

const isNotesPanelOpen = ref(false)
const selectedDate = ref(new Date())

const openNotesPanel = () => {
    isNotesPanelOpen.value = true
    selectedDate.value = new Date()
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
